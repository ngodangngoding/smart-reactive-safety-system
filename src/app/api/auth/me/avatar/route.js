import { writeFile, mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import prisma from "@/lib/prisma";
import { withRoute, ok } from "@/lib/apiResponse";
import { getAuthUser, toSafeUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/auditLog";
import { ValidationError } from "@/lib/errors";

export const runtime = "nodejs";

const ALLOWED_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_BYTES = 5 * 1024 * 1024;
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "avatars");

async function removeAvatarFile(avatarUrl) {
  if (!avatarUrl) return;
  await unlink(path.join(process.cwd(), "public", avatarUrl.replace(/^\//, ""))).catch(() => {});
}

export const POST = withRoute(async (request) => {
  const user = await getAuthUser(request);

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof Blob) || file.size === 0) throw new ValidationError("file is required");

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) throw new ValidationError("Only JPG, PNG or WEBP images are allowed", "INVALID_FILE_TYPE");
  if (file.size > MAX_BYTES) throw new ValidationError("Image must be 5MB or smaller", "FILE_TOO_LARGE");

  await mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `${user.id}-${crypto.randomUUID()}.${ext}`;
  await writeFile(path.join(UPLOAD_DIR, filename), Buffer.from(await file.arrayBuffer()));

  const avatarUrl = `/uploads/avatars/${filename}`;
  const previousAvatarUrl = user.avatarUrl;

  const updated = await prisma.user.update({ where: { id: user.id }, data: { avatarUrl } });
  await removeAvatarFile(previousAvatarUrl);

  await writeAuditLog({
    organizationId: user.organizationId,
    performedByUserId: user.id,
    action: "UPDATE_USER",
    metadata: { target: { table: "User", id: user.id }, after: { avatarUrl } },
  });

  return ok({ user: toSafeUser(updated) }, "Profile picture updated successfully.");
});

export const DELETE = withRoute(async (request) => {
  const user = await getAuthUser(request);
  if (!user.avatarUrl) return ok({ user: toSafeUser(user) }, "No profile picture to remove.");

  const updated = await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: null } });
  await removeAvatarFile(user.avatarUrl);

  await writeAuditLog({
    organizationId: user.organizationId,
    performedByUserId: user.id,
    action: "UPDATE_USER",
    metadata: { target: { table: "User", id: user.id }, after: { avatarUrl: null } },
  });

  return ok({ user: toSafeUser(updated) }, "Profile picture removed.");
});
