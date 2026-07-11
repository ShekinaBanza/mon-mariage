import { db } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth";
import { createTableWithSeats } from "../src/lib/seat-service";
import { ROLES } from "../src/lib/constants";

async function main() {
  console.log("🌱 Seeding database...");

  // Settings
  const settings = await db.weddingSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
  console.log("✓ Wedding settings");

  // Admin users
  const admins = [
    { name: "Super Admin", email: "admin@sr-wedding.app", password: "Admin@2026", role: ROLES.SUPER_ADMIN },
    { name: "Organisateur", email: "organizer@sr-wedding.app", password: "Org@2026", role: ROLES.ORGANIZER },
    { name: "Agent Enregistrement", email: "register@sr-wedding.app", password: "Register@2026", role: ROLES.REGISTRATION_AGENT },
    { name: "Agent Contrôle", email: "control@sr-wedding.app", password: "Control@2026", role: ROLES.CONTROL_AGENT },
    { name: "Lecteur Stats", email: "reader@sr-wedding.app", password: "Reader@2026", role: ROLES.READER },
  ];
  for (const a of admins) {
    await db.user.upsert({
      where: { email: a.email },
      update: {},
      create: {
        name: a.name,
        email: a.email,
        passwordHash: await hashPassword(a.password),
        role: a.role,
        active: true,
      },
    });
  }
  console.log(`✓ ${admins.length} admin users`);

  // Tables — clear existing then recreate
  await db.seatAssignment.deleteMany();
  await db.seat.deleteMany();
  await db.table.deleteMany();
  console.log("✓ Cleared tables & seats");

  // Groom side tables (T1..T5)
  const groomTables = [
    { name: "T1", zone: "groom", capacity: 8, positionX: -300, positionY: -120 },
    { name: "T2", zone: "groom", capacity: 8, positionX: -300, positionY: 120 },
    { name: "T3", zone: "groom", capacity: 8, positionX: -150, positionY: -120 },
    { name: "T4", zone: "groom", capacity: 8, positionX: -150, positionY: 120 },
    { name: "T5", zone: "groom", capacity: 6, positionX: -380, positionY: 0 },
  ];
  // Bride side tables (T6..T10)
  const brideTables = [
    { name: "T6", zone: "bride", capacity: 8, positionX: 150, positionY: -120 },
    { name: "T7", zone: "bride", capacity: 8, positionX: 150, positionY: 120 },
    { name: "T8", zone: "bride", capacity: 8, positionX: 300, positionY: -120 },
    { name: "T9", zone: "bride", capacity: 8, positionX: 300, positionY: 120 },
    { name: "T10", zone: "bride", capacity: 6, positionX: 380, positionY: 0 },
  ];
  // Common tables (T11, T12)
  const commonTables = [
    { name: "T11", zone: "common", capacity: 10, positionX: 0, positionY: -220 },
    { name: "T12", zone: "common", capacity: 10, positionX: 0, positionY: 220 },
  ];

  for (const t of [...groomTables, ...brideTables, ...commonTables]) {
    await createTableWithSeats(t);
  }
  console.log(`✓ ${groomTables.length + brideTables.length + commonTables.length} tables created`);

  console.log("\n🎉 Seed complete!");
  console.log("\nDemo admin accounts:");
  for (const a of admins) {
    console.log(`  ${a.role.padEnd(22)} ${a.email} / ${a.password}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
