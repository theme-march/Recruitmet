import "server-only";

import { can } from "@/lib/authorization";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import type { AwaitedSession } from "@/lib/types";
import { privateStorage } from "@/server/storage";
import {
  CANDIDATE_PROFILE_IMAGE_MAX_BYTES,
  CANDIDATE_PROFILE_IMAGE_TYPES,
  detectCandidateProfileImageMime,
} from "./profile-image-validation";

type Session = NonNullable<AwaitedSession>;

export async function findCandidate(candidateId: string) {
  const candidate = await prisma.candidate.findFirst({
    where: { OR: [{ id: candidateId }, { candidateNo: candidateId }] },
  });
  if (!candidate) throw new AppError("NOT_FOUND", "Candidate not found.", 404);
  return candidate;
}

export async function getCandidateProfileImage(candidateId: string, _session?: Session) {
  const candidate = await findCandidate(candidateId);
  if (!candidate.photo) throw new AppError("NOT_FOUND", "Candidate profile photo not found.", 404);

  let mimeType = "image/jpeg";
  if (candidate.photo.endsWith(".png")) mimeType = "image/png";
  else if (candidate.photo.endsWith(".webp")) mimeType = "image/webp";

  const bytes = await privateStorage().get(candidate.photo);
  const crypto = await import("node:crypto");
  const checksum = crypto.createHash("sha256").update(bytes).digest("hex");

  return {
    bytes,
    mimeType,
    checksum,
  };
}

export async function uploadCandidateProfileImage(
  candidateId: string,
  file: File,
  session: Session,
) {
  if (!(await can(session, "call-center", "Edit")) && !(await can(session, "call-center", "create"))) {
    throw new AppError("FORBIDDEN", "Edit permission is required to update candidate photo.", 403);
  }
  const candidate = await findCandidate(candidateId);

  if (!CANDIDATE_PROFILE_IMAGE_TYPES.includes(file.type as (typeof CANDIDATE_PROFILE_IMAGE_TYPES)[number])) {
    throw new AppError("FILE_TYPE_INVALID", "Only JPEG, PNG, and WebP profile images are allowed.", 422);
  }
  if (file.size < 1 || file.size > CANDIDATE_PROFILE_IMAGE_MAX_BYTES) {
    throw new AppError("FILE_SIZE_INVALID", "Profile image must be smaller than 3 MB.", 422);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detectedMime = detectCandidateProfileImageMime(bytes);
  if (!detectedMime || detectedMime !== file.type) {
    throw new AppError("FILE_CONTENT_INVALID", "The selected file is not a valid image.", 422);
  }

  const stored = await privateStorage().put({
    bytes,
    originalName: file.name,
    mimeType: detectedMime,
  });

  const oldPhotoKey = candidate.photo;

  await prisma.$transaction(async (tx) => {
    await tx.candidate.update({
      where: { id: candidate.id },
      data: { photo: stored.objectKey },
    });
    await tx.auditLog.create({
      data: {
        userId: session.userId,
        role: session.user.role.name,
        module: "Candidate",
        recordId: candidate.id,
        action: oldPhotoKey ? "REPLACE_CANDIDATE_PHOTO" : "UPLOAD_CANDIDATE_PHOTO",
        newValue: { mimeType: detectedMime, sizeBytes: stored.sizeBytes, objectKey: stored.objectKey },
        correlationId: crypto.randomUUID(),
      },
    });
  });

  if (oldPhotoKey && oldPhotoKey !== stored.objectKey) {
    await privateStorage().remove(oldPhotoKey).catch(() => {});
  }

  return {
    objectKey: stored.objectKey,
    mimeType: detectedMime,
    sizeBytes: stored.sizeBytes,
    url: `/api/candidates/${candidate.id}/photo?v=${Date.now()}`,
  };
}

export async function removeCandidateProfileImage(candidateId: string, session: Session) {
  if (!(await can(session, "call-center", "Edit")) && !(await can(session, "call-center", "create"))) {
    throw new AppError("FORBIDDEN", "Edit permission is required to remove candidate photo.", 403);
  }
  const candidate = await findCandidate(candidateId);
  if (!candidate.photo) return false;

  const oldPhotoKey = candidate.photo;

  await prisma.$transaction(async (tx) => {
    await tx.candidate.update({
      where: { id: candidate.id },
      data: { photo: null },
    });
    await tx.auditLog.create({
      data: {
        userId: session.userId,
        role: session.user.role.name,
        module: "Candidate",
        recordId: candidate.id,
        action: "REMOVE_CANDIDATE_PHOTO",
        oldValue: { objectKey: oldPhotoKey },
        correlationId: crypto.randomUUID(),
      },
    });
  });

  await privateStorage().remove(oldPhotoKey).catch(() => {});
  return true;
}
