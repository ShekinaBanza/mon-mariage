import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getDatabaseInfo() {
  const databaseUrl = process.env.DATABASE_URL || "";

  return {
    configured: Boolean(databaseUrl),
    sqlite: databaseUrl.startsWith("file:"),
    absolutePath: databaseUrl.startsWith("file:/"),
  };
}

export async function GET() {
  const database = getDatabaseInfo();

  try {
    const { db } = await import("@/lib/db");
    await db.weddingSettings.count();

    return NextResponse.json({
      ok: true,
      database,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        database,
        error: error instanceof Error ? error.message : "Unknown database error",
      },
      { status: 500 },
    );
  }
}
