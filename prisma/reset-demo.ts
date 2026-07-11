import { db } from "../src/lib/db";
import { createTableWithSeats } from "../src/lib/seat-service";

/**
 * Reset script:
 *  - Clears ALL demo data (guests, invitations, members, assignments, logs)
 *  - Recreates tables with capacity 6 (enough for 250 people → 42 tables = 252 seats)
 *  - Updates settings: maxPeople=250, ceremonyTime="14h00"
 */
async function main() {
  console.log("🧹 Resetting database (removing all demo data)...");

  // Clear all transactional/log data first (respecting FK constraints)
  await db.invitationDownload.deleteMany();
  await db.invitationShare.deleteMany();
  await db.attendanceLog.deleteMany();
  await db.scanLog.deleteMany();
  await db.failedScanAttempt.deleteMany();
  await db.activityLog.deleteMany();
  await db.loginAttempt.deleteMany();

  // Clear seat assignments, seats, tables
  await db.seatAssignment.deleteMany();
  await db.seat.deleteMany();
  await db.table.deleteMany();

  // Clear invitations, members, guests
  await db.invitationMember.deleteMany();
  await db.invitation.deleteMany();
  await db.guest.deleteMany();

  console.log("✓ All demo data cleared (guests, invitations, tables, logs)");

  // Update settings
  await db.weddingSettings.update({
    where: { id: "default" },
    data: {
      maxPeople: 250,
      maxInvitations: 160,
      ceremonyTime: "14h00",
      receptionTime: "19h00",
      registrationOpen: true,
      validationMode: "auto",
    },
  });
  console.log("✓ Settings updated: maxPeople=250, ceremonyTime=14h00");

  // Create tables: 42 tables × 6 seats = 252 seats (enough for 250 max people)
  // Distribution: 14 groom + 14 bride + 14 common
  console.log("🏗️  Creating tables (capacity 6 each)...");

  const capacity = 6;
  const colSpacing = 130;
  const rowSpacing = 170;

  // Groom zone (left side): T1..T14 — 7 columns × 2 rows
  for (let i = 0; i < 14; i++) {
    const col = i % 7;
    const row = Math.floor(i / 7);
    const name = `T${i + 1}`;
    await createTableWithSeats({
      name,
      zone: "groom",
      capacity,
      shape: "round",
      positionX: -420 + col * colSpacing,
      positionY: -90 + row * rowSpacing,
    });
  }

  // Bride zone (right side): T15..T28 — 7 columns × 2 rows
  for (let i = 0; i < 14; i++) {
    const col = i % 7;
    const row = Math.floor(i / 7);
    const name = `T${i + 15}`;
    await createTableWithSeats({
      name,
      zone: "bride",
      capacity,
      shape: "round",
      positionX: 30 + col * colSpacing,
      positionY: -90 + row * rowSpacing,
    });
  }

  // Common zone (center top & bottom): T29..T42 — 7 columns × 2 rows
  for (let i = 0; i < 14; i++) {
    const col = i % 7;
    const row = Math.floor(i / 7);
    const name = `T${i + 29}`;
    await createTableWithSeats({
      name,
      zone: "common",
      capacity,
      shape: "round",
      positionX: -390 + col * colSpacing,
      positionY: 290 + row * (rowSpacing - 20),
    });
  }

  const tableCount = await db.table.count();
  const seatCount = await db.seat.count();
  console.log(`✓ ${tableCount} tables created (${seatCount} seats total)`);
  console.log("\n🎉 Reset complete!");
  console.log(`   • maxPeople = 250`);
  console.log(`   • ceremonyTime = 14h00`);
  console.log(`   • ${tableCount} tables × ${capacity} seats = ${seatCount} seats`);
  console.log(`   • 0 guests (all demo data removed)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
