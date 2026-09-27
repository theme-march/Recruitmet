import "server-only";

import { can, requirePermission } from "@/lib/authorization";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import type { AwaitedSession } from "@/lib/types";
import { privateStorage } from "@/server/storage";
import {
  AGENT_PROFILE_IMAGE_MAX_BYTES,
  AGENT_PROFILE_IMAGE_TYPES,
  detectAgentProfileImageMime,
} from "./profile-image-validation";

type Session = NonNullable<AwaitedSession>;

async function findAgent(agentId: string) {
  const agent = await prisma.agent.findFirst({
    where: { OR: [{ id: agentId }, { code: agentId }] },
    include: { profileImage: true },
  });
  if (!agent) throw new AppError("NOT_FOUND", "Agent partner not found.", 404);
  return agent;
}

export async function getAgentProfileImage(agentId: string, session: Session) {
  const agent = await findAgent(agentId);
  const isOwnAgentProfile = session.user.agentId === agent.id;
  if (!isOwnAgentProfile && !(await can(session, "agents", "read"))) {
    throw new AppError("FORBIDDEN", "Agent profile view permission is required.", 403);
  }
  if (!agent.profileImage) throw new AppError("NOT_FOUND", "Profile image not found.", 404);
  if (agent.profileImage.scanStatus === "Infected") {
    throw new AppError("FILE_BLOCKED", "The profile image failed the security scan.", 423);
  }

  return {
    bytes: await privateStorage().get(agent.profileImage.objectKey),
    mimeType: agent.profileImage.mimeType,
    checksum: agent.profileImage.checksum,
  };
}

export async function uploadAgentProfileImage(
  agentId: string,
  file: File,
  session: Session,
  permission: "create" | "edit" = "edit",
) {
  await requirePermission(session, "agents", permission);
  const agent = await findAgent(agentId);

  if (!AGENT_PROFILE_IMAGE_TYPES.includes(file.type as (typeof AGENT_PROFILE_IMAGE_TYPES)[number])) {
    throw new AppError("FILE_TYPE_INVALID", "Only JPEG, PNG, and WebP profile images are allowed.", 422);
  }
  if (file.size < 1 || file.size > AGENT_PROFILE_IMAGE_MAX_BYTES) {
    throw new AppError("FILE_SIZE_INVALID", "Profile image must be smaller than 3 MB.", 422);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detectedMime = detectAgentProfileImageMime(bytes);
  if (!detectedMime || detectedMime !== file.type) {
    throw new AppError("FILE_CONTENT_INVALID", "The selected file is not a valid image.", 422);
  }

  const stored = await privateStorage().put({
    bytes,
    originalName: file.name,
    mimeType: detectedMime,
  });

  let objectId: string;
  try {
    objectId = await prisma.$transaction(async (tx) => {
      const object = await tx.storedObject.create({
        data: {
          ...stored,
          originalName: file.name,
          mimeType: detectedMime,
          scanStatus: "Accepted",
          createdBy: session.userId,
        },
      });
      await tx.agent.update({
        where: { id: agent.id },
        data: { profileImageObjectId: object.id },
      });
      await tx.auditLog.create({
        data: {
          userId: session.userId,
          role: session.user.role.name,
          module: "Agents",
          recordId: agent.id,
          action: agent.profileImage ? "REPLACE_PROFILE_IMAGE" : "UPLOAD_PROFILE_IMAGE",
          newValue: { mimeType: detectedMime, sizeBytes: stored.sizeBytes },
          correlationId: crypto.randomUUID(),
        },
      });
      return object.id;
    });
  } catch (error) {
    await privateStorage().remove(stored.objectKey).catch(() => {});
    throw error;
  }

  if (agent.profileImage && agent.profileImage.id !== objectId) {
    await privateStorage().remove(agent.profileImage.objectKey).catch(() => {});
    await prisma.storedObject.delete({ where: { id: agent.profileImage.id } }).catch(() => {});
  }

  return { objectId, mimeType: detectedMime, sizeBytes: stored.sizeBytes };
}

export async function removeAgentProfileImage(agentId: string, session: Session) {
  await requirePermission(session, "agents", "edit");
  const agent = await findAgent(agentId);
  if (!agent.profileImage) return false;

  await prisma.$transaction(async (tx) => {
    await tx.agent.update({
      where: { id: agent.id },
      data: { profileImageObjectId: null },
    });
    await tx.auditLog.create({
      data: {
        userId: session.userId,
        role: session.user.role.name,
        module: "Agents",
        recordId: agent.id,
        action: "REMOVE_PROFILE_IMAGE",
        oldValue: { mimeType: agent.profileImage!.mimeType, sizeBytes: agent.profileImage!.sizeBytes },
        correlationId: crypto.randomUUID(),
      },
    });
  });

  await privateStorage().remove(agent.profileImage.objectKey).catch(() => {});
  await prisma.storedObject.delete({ where: { id: agent.profileImage.id } }).catch(() => {});
  return true;
}
