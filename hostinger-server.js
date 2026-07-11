const fs = require("node:fs");
const path = require("node:path");

process.env.NODE_ENV = process.env.NODE_ENV || "production";
process.env.HOSTNAME = process.env.HOSTNAME || "0.0.0.0";
process.env.DATABASE_URL = process.env.DATABASE_URL || "file:../data/custom.db";

function resolveSqlitePath(databaseUrl) {
  if (!databaseUrl.startsWith("file:")) return null;

  const sqlitePath = databaseUrl.slice("file:".length);
  if (path.isAbsolute(sqlitePath)) return sqlitePath;

  // Prisma resolves relative SQLite paths from prisma/schema.prisma.
  return path.resolve(__dirname, "prisma", sqlitePath);
}

const sqlitePath = resolveSqlitePath(process.env.DATABASE_URL);
if (sqlitePath) {
  fs.mkdirSync(path.dirname(sqlitePath), { recursive: true });

  const bundledDatabase = path.join(__dirname, "db", "custom.db");
  if (!fs.existsSync(sqlitePath) && fs.existsSync(bundledDatabase)) {
    fs.copyFileSync(bundledDatabase, sqlitePath);
  }

  process.env.DATABASE_URL = `file:${sqlitePath}`;
  console.log(`[hostinger] SQLite database ready: ${sqlitePath}`);
}

require("./.next/standalone/server.js");
