import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminShell } from "@/components/wedding/admin-shell";
import { ROLES } from "@/lib/constants";
import { getPublicSettings } from "@/lib/settings";
import { formatWeddingDateLabel } from "@/lib/date-format";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/admin/login");

  const dbUser = await db.user.findUnique({ where: { id: user.id } });
  if (!dbUser || !dbUser.active) redirect("/admin/login");
  if (dbUser.role === ROLES.CONTROL_AGENT) redirect("/scan");

  const settings = await getPublicSettings();
  const footerLine = `${settings.monogram} — Mariage de ${settings.groomFirstName} & ${settings.brideFirstName} · ${formatWeddingDateLabel(settings.weddingDate)}`;

  return <AdminShell user={{ ...user, role: dbUser.role }} footerLine={footerLine}>{children}</AdminShell>;
}
