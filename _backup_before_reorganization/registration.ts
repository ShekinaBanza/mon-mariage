import { db } from "@/lib/db";
import { INVITATION_STATUS, INVITATION_TYPE, ASSIGNMENT_STATE, PRESENCE_STATE, VALIDATION_MODE } from "@/lib/constants";
import { generatePublicToken, generateBackupCode, generateQrCode } from "@/lib/codes";
import { findSeatsForIndividual, findSeatsForCouple, assignSeatsToInvitation } from "@/lib/seat-service";

export class RegistrationError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "RegistrationError";
  }
}

export interface DuplicateMatch {
  invitationId: string;
  publicToken: string;
  code: string;
  reason: string;
  displayName: string;
}

/**
 * Detect potential duplicates based on whatsapp, email, name combination,
 * couple name combination, or existing code.
 */
export async function detectDuplicates(params: {
  whatsapp?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  partnerFirstName?: string;
  partnerLastName?: string;
  type: string;
}): Promise<DuplicateMatch[]> {
  const { whatsapp, email, firstName, lastName, partnerFirstName, partnerLastName, type } = params;
  const matches: DuplicateMatch[] = [];
  const seen = new Set<string>();

  const normalize = (s?: string) => (s ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // By whatsapp
  if (whatsapp) {
    const guest = await db.guest.findFirst({
      where: { whatsapp: whatsapp.trim() },
      include: { invitations: { include: { members: true } } },
    });
    if (guest && guest.invitations.length > 0) {
      const inv = guest.invitations[0];
      if (!seen.has(inv.id)) {
        seen.add(inv.id);
        matches.push({
          invitationId: inv.id,
          publicToken: inv.publicToken,
          code: inv.code,
          reason: "Numéro WhatsApp déjà enregistré",
          displayName: `${guest.firstName} ${guest.lastName}`,
        });
      }
    }
  }

  // By email
  if (email) {
    const guest = await db.guest.findFirst({
      where: { email: email.trim().toLowerCase() },
      include: { invitations: { include: { members: true } } },
    });
    if (guest && guest.invitations.length > 0) {
      const inv = guest.invitations[0];
      if (!seen.has(inv.id)) {
        seen.add(inv.id);
        matches.push({
          invitationId: inv.id,
          publicToken: inv.publicToken,
          code: inv.code,
          reason: "Adresse e-mail déjà enregistrée",
          displayName: `${guest.firstName} ${guest.lastName}`,
        });
      }
    }
  }

  // By name combination (first + last)
  if (firstName && lastName) {
    const fn = normalize(firstName);
    const ln = normalize(lastName);
    const guests = await db.guest.findMany({
      where: { firstName: { equals: firstName }, lastName: { equals: lastName } },
      include: { invitations: true },
    });
    for (const g of guests) {
      if (normalize(g.firstName) === fn && normalize(g.lastName) === ln && g.invitations.length > 0) {
        const inv = g.invitations[0];
        if (!seen.has(inv.id)) {
          seen.add(inv.id);
          matches.push({
            invitationId: inv.id,
            publicToken: inv.publicToken,
            code: inv.code,
            reason: "Nom et prénom déjà enregistrés",
            displayName: `${g.firstName} ${g.lastName}`,
          });
        }
      }
    }
  }

  // For couple: check if both names match an existing couple invitation's members
  if (type === INVITATION_TYPE.COUPLE && firstName && lastName && partnerFirstName && partnerLastName) {
    const allCoupleInvites = await db.invitation.findMany({
      where: { type: INVITATION_TYPE.COUPLE },
      include: { members: true, guest: true },
    });
    const n1 = `${normalize(firstName)} ${normalize(lastName)}`;
    const n2 = `${normalize(partnerFirstName)} ${normalize(partnerLastName)}`;
    for (const inv of allCoupleInvites) {
      if (inv.members.length === 2) {
        const m1 = `${normalize(inv.members[0].firstName)} ${normalize(inv.members[0].lastName)}`;
        const m2 = `${normalize(inv.members[1].firstName)} ${normalize(inv.members[1].lastName)}`;
        const sameCombo =
          (m1 === n1 && m2 === n2) || (m1 === n2 && m2 === n1);
        if (sameCombo && !seen.has(inv.id)) {
          seen.add(inv.id);
          matches.push({
            invitationId: inv.id,
            publicToken: inv.publicToken,
            code: inv.code,
            reason: "Ce couple est déjà enregistré",
            displayName: `${inv.members[0].firstName} ${inv.members[0].lastName} & ${inv.members[1].firstName} ${inv.members[1].lastName}`,
          });
        }
      }
    }
  }

  return matches;
}

export interface RegistrationInput {
  type: "individual" | "couple";
  side: "groom" | "bride";
  whatsapp: string;
  email?: string;
  sex?: string;
  comment?: string;
  // Person 1 (and contact for couple)
  firstName: string;
  lastName: string;
  middleName?: string;
  // Person 2 (couple only)
  partnerFirstName?: string;
  partnerLastName?: string;
  partnerMiddleName?: string;
}

export interface RegistrationResult {
  success: boolean;
  invitationId: string;
  publicToken: string;
  code: string;
  qrCode: string;
  status: string;
  assigned: boolean;
  table?: string;
  seats?: string[];
  message: string;
}

/**
 * Register a new invitation. Performs duplicate detection, creates the
 * guest + invitation + members, and — in auto mode — assigns seats.
 * All inside a transaction.
 */
export async function registerInvitation(input: RegistrationInput): Promise<RegistrationResult> {
  const settings = await db.weddingSettings.findUnique({ where: { id: "default" } });
  if (!settings) throw new RegistrationError("CONFIG_MISSING", "Configuration du mariage introuvable.");

  if (!settings.registrationOpen) {
    throw new RegistrationError("CLOSED", "Les inscriptions sont actuellement fermées.");
  }
  if (settings.registrationDeadline && new Date() > settings.registrationDeadline) {
    throw new RegistrationError("DEADLINE", "La date limite d'inscription est dépassée.");
  }

  // Capacity limits
  const totalPeople = await db.invitationMember.count();
  const totalInvitations = await db.invitation.count({ where: { status: { not: INVITATION_STATUS.CANCELLED } } });
  const requestedPeople = input.type === INVITATION_TYPE.COUPLE ? 2 : 1;
  if (settings.maxPeople > 0 && totalPeople + requestedPeople > settings.maxPeople) {
    throw new RegistrationError("FULL", "Le nombre maximal d'invités a été atteint.");
  }
  if (settings.maxInvitations > 0 && totalInvitations + 1 > settings.maxInvitations) {
    throw new RegistrationError("MAX_INVITES", "Le nombre maximal d'invitations a été atteint.");
  }

  return db.$transaction(async (tx) => {
    // Create guest (contact)
    const guest = await tx.guest.create({
      data: {
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        middleName: input.middleName?.trim() || null,
        whatsapp: input.whatsapp.trim(),
        email: input.email?.trim().toLowerCase() || null,
        sex: input.sex || null,
        side: input.side,
        comment: input.comment?.trim() || null,
      },
    });

    const publicToken = generatePublicToken(10);
    const backupCode = generateBackupCode(input.lastName);
    // ensure backup code uniqueness within tx
    let code = backupCode;
    let attempts = 0;
    while (await tx.invitation.findUnique({ where: { code } })) {
      code = generateBackupCode(input.lastName);
      attempts++;
      if (attempts > 20) break;
    }

    // Generate a unique 6-char QR code linked to this person/couple.
    let qrCode = generateQrCode();
    let qrAttempts = 0;
    while (await tx.invitation.findUnique({ where: { qrCode } })) {
      qrCode = generateQrCode();
      qrAttempts++;
      if (qrAttempts > 20) break;
    }

    const seatCount = input.type === INVITATION_TYPE.COUPLE ? 2 : 1;
    const autoMode = settings.validationMode === VALIDATION_MODE.AUTO;

    const invitation = await tx.invitation.create({
      data: {
        code,
        publicToken,
        qrCode,
        type: input.type,
        side: input.side,
        status: autoMode ? INVITATION_STATUS.ACTIVE : INVITATION_STATUS.PENDING,
        assignmentState: ASSIGNMENT_STATE.UNASSIGNED,
        presenceState: PRESENCE_STATE.NOT_ARRIVED,
        seatCount,
        guestId: guest.id,
        validatedAt: autoMode ? new Date() : null,
      },
    });

    // Members
    const members = [];
    const m1 = await tx.invitationMember.create({
      data: {
        invitationId: invitation.id,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        middleName: input.middleName?.trim() || null,
        sex: input.sex || null,
      },
    });
    members.push(m1);

    if (input.type === INVITATION_TYPE.COUPLE && input.partnerFirstName && input.partnerLastName) {
      const m2 = await tx.invitationMember.create({
        data: {
          invitationId: invitation.id,
          firstName: input.partnerFirstName.trim(),
          lastName: input.partnerLastName.trim(),
          middleName: input.partnerMiddleName?.trim() || null,
        },
      });
      members.push(m2);
    }

    return { invitation, guest, members };
  }).then(async ({ invitation, members }) => {
    // Auto-assign seats if auto mode
    if (settings.validationMode === VALIDATION_MODE.AUTO) {
      try {
        if (input.type === INVITATION_TYPE.COUPLE) {
          const found = await findSeatsForCouple(input.side);
          if (found) {
            await assignSeatsToInvitation({
              invitationId: invitation.id,
              memberIds: members.map((m) => m.id),
              seatIds: [found.seat1.id, found.seat2.id],
              allowZoneMismatch: found.zoneMismatch,
            });
          }
        } else {
          const found = await findSeatsForIndividual(input.side);
          if (found) {
            await assignSeatsToInvitation({
              invitationId: invitation.id,
              memberIds: [members[0].id],
              seatIds: [found.seat.id],
              allowZoneMismatch: found.zoneMismatch,
            });
          }
        }
      } catch (e) {
        // seat assignment failed — invitation still created, marked unassigned
        console.error("Seat assignment failed:", e);
      }
    }

    const finalInv = await db.invitation.findUnique({
      where: { id: invitation.id },
      include: { table: true, assignments: { include: { seat: true } }, members: true },
    });

    return {
      success: true,
      invitationId: invitation.id,
      publicToken: invitation.publicToken,
      code: invitation.code,
      qrCode: invitation.qrCode,
      status: finalInv!.status,
      assigned: finalInv!.assignmentState === ASSIGNMENT_STATE.ASSIGNED,
      table: finalInv!.table?.name,
      seats: finalInv!.assignments.map((a) => a.seat.code).sort(),
      message:
        settings.validationMode === VALIDATION_MODE.AUTO
          ? finalInv!.assignmentState === ASSIGNMENT_STATE.ASSIGNED
            ? "Votre invitation a été générée et votre place attribuée."
            : "Votre demande a été enregistrée. Aucune place n'est actuellement disponible."
          : "Votre demande a été enregistrée. Elle est en attente de validation par l'administrateur.",
    };
  });
}

/**
 * Find an invitation by its public token, with all display data.
 */
export async function getInvitationByToken(publicToken: string) {
  return db.invitation.findUnique({
    where: { publicToken },
    include: {
      guest: true,
      members: true,
      table: { include: { seats: true } },
      assignments: { include: { seat: true, member: true } },
    },
  });
}

/**
 * Find an invitation by its backup code or qrCode (case-insensitive, tolerant).
 */
export async function getInvitationByCode(rawCode: string) {
  const { normalizeCode } = await import("@/lib/codes");
  const normalized = normalizeCode(rawCode);
  const upper = rawCode.toUpperCase().trim();

  // Try by qrCode (short 6-char) first
  if (/^[A-Z0-9]{6}$/.test(upper)) {
    const byQr = await db.invitation.findUnique({
      where: { qrCode: upper },
      include: { guest: true, members: true, table: true, assignments: { include: { seat: true } } },
    });
    if (byQr) return byQr;
  }

  // Try by backup code (exact match)
  let inv = await db.invitation.findUnique({
    where: { code: normalized },
    include: { guest: true, members: true, table: true, assignments: { include: { seat: true } } },
  });
  if (inv) return inv;

  // Fallback: case-insensitive scan (codes are stored uppercase already)
  const all = await db.invitation.findMany({ include: { guest: true, members: true, table: true, assignments: { include: { seat: true } } } });
  return all.find((i) => normalizeCode(i.code) === normalized) ?? null;
}
