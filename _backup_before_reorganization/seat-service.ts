import { db } from "@/lib/db";
import { SEAT_STATUS, TABLE_ZONE, INVITATION_SIDE } from "@/lib/constants";

export class SeatAssignmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SeatAssignmentError";
  }
}

/**
 * Generate a seat code from table name + seat number.
 * e.g. Table 1, seat 1 -> T1C1 ; Table A, seat 1 -> TAC1
 */
export function seatCode(tableName: string, seatNumber: number): string {
  const tag = tableName
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/TABLE/i, "T");
  // If table name is just "1", produce T1; if "A", produce TA
  const base = tag.startsWith("T") ? tag : `T${tag}`;
  return `${base}C${seatNumber}`;
}

/**
 * Create a table with N seats arranged in a circle (for round) or rectangle.
 */
export async function createTableWithSeats(params: {
  name: string;
  zone: string;
  capacity: number;
  shape?: string;
  positionX?: number;
  positionY?: number;
}) {
  const { name, zone, capacity, shape = "round", positionX = 0, positionY = 0 } = params;
  return db.$transaction(async (tx) => {
    const table = await tx.table.create({
      data: {
        name,
        zone,
        capacity,
        shape,
        positionX,
        positionY,
        active: true,
      },
    });
    const seats = [];
    for (let i = 1; i <= capacity; i++) {
      // Position seats around the table
      const angle = (i / capacity) * 2 * Math.PI;
      const radius = shape === "round" ? 50 : 55;
      const seat = await tx.seat.create({
        data: {
          tableId: table.id,
          number: i,
          code: seatCode(name, i),
          positionX: shape === "round" ? Math.cos(angle) * radius : (i % 2 === 0 ? 50 : -50),
          positionY: shape === "round" ? Math.sin(angle) * radius : ((Math.floor((i - 1) / 2)) - (capacity / 4)) * 40,
          status: SEAT_STATUS.AVAILABLE,
        },
      });
      seats.push(seat);
    }
    return { table, seats };
  });
}

/**
 * Check whether a seat's table zone is compatible with the invitation side.
 * common zone is always compatible; groom/bride must match the side.
 */
function zoneCompatible(invitationSide: string, tableZone: string): boolean {
  if (tableZone === TABLE_ZONE.COMMON) return true;
  if (invitationSide === INVITATION_SIDE.GROOM && tableZone === TABLE_ZONE.GROOM) return true;
  if (invitationSide === INVITATION_SIDE.BRIDE && tableZone === TABLE_ZONE.BRIDE) return true;
  return false;
}

/**
 * Find the best available seat for an individual invitation.
 * Prefers tables in the matching zone, with the most free seats.
 */
export async function findSeatsForIndividual(invitationSide: string) {
  const tables = await db.table.findMany({
    where: { active: true, locked: false },
    include: {
      seats: { orderBy: { number: "asc" } },
      assignments: true,
    },
    orderBy: { name: "asc" },
  });

  // Score tables: matching zone first, then most free seats
  const scored = tables
    .filter((t) => {
      const occupied = t.assignments.length;
      return occupied < t.capacity;
    })
    .map((t) => {
      const occupied = t.assignments.length;
      const freeSeats = t.seats.filter(
        (s) => s.status === SEAT_STATUS.AVAILABLE && !t.assignments.some((a) => a.seatId === s.id)
      );
      const zoneMatch =
        (invitationSide === INVITATION_SIDE.GROOM && t.zone === TABLE_ZONE.GROOM) ||
        (invitationSide === INVITATION_SIDE.BRIDE && t.zone === TABLE_ZONE.BRIDE) ||
        t.zone === TABLE_ZONE.COMMON;
      return {
        table: t,
        freeSeats,
        zoneMatch,
        score: (zoneMatch ? 1000 : 0) + freeSeats.length,
      };
    })
    .filter((s) => s.freeSeats.length > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return null;

  const best = scored[0];
  if (!best.zoneMatch) {
    // No matching-zone table available — caller must decide (admin override or reject)
    return { table: best.table, seat: best.freeSeats[0], zoneMismatch: true };
  }
  return { table: best.table, seat: best.freeSeats[0], zoneMismatch: false };
}

/**
 * Find two adjacent/consecutive seats for a couple at the same table.
 */
export async function findSeatsForCouple(invitationSide: string) {
  const tables = await db.table.findMany({
    where: { active: true, locked: false },
    include: {
      seats: { orderBy: { number: "asc" } },
      assignments: true,
    },
    orderBy: { name: "asc" },
  });

  const scored = tables
    .filter((t) => t.capacity - t.assignments.length >= 2)
    .map((t) => {
      const freeSeats = t.seats.filter(
        (s) => s.status === SEAT_STATUS.AVAILABLE && !t.assignments.some((a) => a.seatId === s.id)
      );
      const zoneMatch =
        (invitationSide === INVITATION_SIDE.GROOM && t.zone === TABLE_ZONE.GROOM) ||
        (invitationSide === INVITATION_SIDE.BRIDE && t.zone === TABLE_ZONE.BRIDE) ||
        t.zone === TABLE_ZONE.COMMON;

      // Try to find two consecutive seat numbers
      let pair: [typeof freeSeats[0], typeof freeSeats[0]] | null = null;
      for (let i = 0; i < freeSeats.length - 1; i++) {
        if (freeSeats[i + 1].number - freeSeats[i].number === 1) {
          pair = [freeSeats[i], freeSeats[i + 1]];
          break;
        }
      }
      // If no consecutive pair but we have >=2 free seats, take any two
      if (!pair && freeSeats.length >= 2) {
        pair = [freeSeats[0], freeSeats[1]];
      }
      return {
        table: t,
        pair,
        zoneMatch,
        score: (zoneMatch ? 1000 : 0) + (pair ? freeSeats.length : 0),
      };
    })
    .filter((s) => s.pair !== null)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0 || !scored[0].pair) return null;

  const best = scored[0];
  return {
    table: best.table,
    seat1: best.pair![0],
    seat2: best.pair![1],
    zoneMismatch: !best.zoneMatch,
  };
}

/**
 * Atomically assign seats to an invitation within a transaction.
 * Uses a sequential check-then-assign guarded by re-reading seat status.
 * Throws if a seat is no longer available (race protection).
 */
export async function assignSeatsToInvitation(params: {
  invitationId: string;
  memberIds: string[]; // length 1 (individual) or 2 (couple)
  seatIds: string[];
  allowZoneMismatch?: boolean;
}): Promise<void> {
  const { invitationId, memberIds, seatIds, allowZoneMismatch = false } = params;
  if (memberIds.length !== seatIds.length) {
    throw new SeatAssignmentError("Le nombre de membres et de chaises doit correspondre.");
  }

  await db.$transaction(async (tx) => {
    const invitation = await tx.invitation.findUnique({
      where: { id: invitationId },
      include: { table: true },
    });
    if (!invitation) throw new SeatAssignmentError("Invitation introuvable.");

    // Lock-relevant: re-fetch seats and verify availability inside the transaction
    const seats = await tx.seat.findMany({
      where: { id: { in: seatIds } },
      include: { table: true, assignments: true },
    });

    if (seats.length !== seatIds.length) {
      throw new SeatAssignmentError("Une ou plusieurs chaises sont introuvables.");
    }

    // All seats must be at the same table
    const tableId = seats[0].tableId;
    if (!seats.every((s) => s.tableId === tableId)) {
      throw new SeatAssignmentError("Toutes les chaises doivent être à la même table.");
    }

    const table = seats[0].table;

    // Zone check
    if (!zoneCompatible(invitation.side, table.zone) && !allowZoneMismatch) {
      throw new SeatAssignmentError(
        `Le côté de l'invitation (${invitation.side}) ne correspond pas à la zone de la table (${table.zone}). Autorisation administrative requise.`
      );
    }

    // Table locked?
    if (table.locked) {
      throw new SeatAssignmentError("Cette table est verrouillée.");
    }

    // Each seat must be available and not already assigned
    for (const seat of seats) {
      if (seat.status === SEAT_STATUS.DISABLED) {
        throw new SeatAssignmentError(`La chaise ${seat.code} est désactivée.`);
      }
      if (seat.assignments.length > 0) {
        throw new SeatAssignmentError(`La chaise ${seat.code} est déjà attribuée.`);
      }
    }

    // Capacity check
    const currentAssignments = await tx.seatAssignment.count({ where: { tableId } });
    if (currentAssignments + seatIds.length > table.capacity) {
      throw new SeatAssignmentError(`La table ${table.name} dépasserait sa capacité.`);
    }

    // Create assignments
    for (let i = 0; i < seatIds.length; i++) {
      await tx.seatAssignment.create({
        data: {
          seatId: seatIds[i],
          tableId,
          invitationId,
          memberId: memberIds[i] ?? null,
        },
      });
      await tx.seat.update({
        where: { id: seatIds[i] },
        data: { status: SEAT_STATUS.OCCUPIED },
      });
    }

    // Update invitation
    const assignmentState =
      seatIds.length === invitation.seatCount
        ? "assigned"
        : "partially_assigned";
    await tx.invitation.update({
      where: { id: invitationId },
      data: { tableId, assignmentState },
    });
  });
}

/**
 * Release all seats held by an invitation (when cancelled / moved).
 */
export async function releaseInvitationSeats(invitationId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const assignments = await tx.seatAssignment.findMany({
      where: { invitationId },
    });
    for (const a of assignments) {
      await tx.seat.update({
        where: { id: a.seatId },
        data: { status: SEAT_STATUS.AVAILABLE },
      });
    }
    await tx.seatAssignment.deleteMany({ where: { invitationId } });
    await tx.invitation.update({
      where: { id: invitationId },
      data: { tableId: null, assignmentState: "unassigned" },
    });
  });
}
