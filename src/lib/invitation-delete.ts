import path from "path";
import fs from "fs/promises";
import { db } from "@/lib/db";
import { releaseInvitationSeats } from "@/lib/seat-service";

function storagePath(relPath?: string | null): string | null {
  if (!relPath || !relPath.startsWith("/storage/")) return null;
  return path.join(process.cwd(), "public", relPath);
}

async function removeStoredFiles(invitation: {
  publicToken: string;
  pdfPath: string | null;
  imagePath: string | null;
  qrcodePath: string | null;
}) {
  const paths = [
    storagePath(invitation.pdfPath),
    storagePath(invitation.imagePath),
    storagePath(invitation.qrcodePath),
    storagePath(`/storage/qr/${invitation.publicToken}.png`),
    storagePath(`/storage/pdf/${invitation.publicToken}.pdf`),
    storagePath(`/storage/img/${invitation.publicToken}.jpg`),
  ].filter((p): p is string => Boolean(p));

  await Promise.all(paths.map((p) => fs.rm(p, { force: true }).catch(() => undefined)));
}

export async function deleteInvitationPermanently(invitationId: string): Promise<void> {
  const invitation = await db.invitation.findUnique({
    where: { id: invitationId },
    select: {
      id: true,
      guestId: true,
      publicToken: true,
      pdfPath: true,
      imagePath: true,
      qrcodePath: true,
    },
  });
  if (!invitation) return;

  await releaseInvitationSeats(invitation.id);
  await removeStoredFiles(invitation);
  await db.invitation.delete({ where: { id: invitation.id } });

  const remainingForGuest = await db.invitation.count({ where: { guestId: invitation.guestId } });
  if (remainingForGuest === 0) {
    await db.guest.delete({ where: { id: invitation.guestId } }).catch(() => undefined);
  }
}
