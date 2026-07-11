import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminShell } from "@/components/wedding/admin-shell";
import { ROLES, ROLE_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/admin/login");

  const dbUser = await db.user.findUnique({ where: { id: user.id } });
  if (!dbUser || !dbUser.active) redirect("/admin/login");

  return <AdminShell user={{ ...user, role: dbUser.role }}>{children}</AdminShell>;
}
