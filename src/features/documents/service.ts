import "server-only";

import { can, officeScope } from "@/lib/authorization";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import type { AwaitedSession } from "@/lib/types";
import { privateStorage } from "@/server/storage";

const allowed = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const maxBytes = 10 * 1024 * 1024;
type Session = NonNullable<AwaitedSession>;

export async function uploadDocument(input: { fileId: string; type: string; number?: string; expiryDate?: Date; file: File }, session: Session) {
  const permitted = await can(session, "documents", "Add") || await can(session, "files", "Update");
  if (!permitted) throw new AppError("FORBIDDEN", "Document upload or file update permission is required.", 403);
  const processingFile = await prisma.processingFile.findFirst({ where: { id: input.fileId, ...officeScope(session) } });
  if (!processingFile) throw new AppError("NOT_FOUND", "File not found in your data scope.", 404);
  if (!allowed.has(input.file.type)) throw new AppError("FILE_TYPE_INVALID", "Only PDF, JPEG, PNG and WebP files are allowed.", 422);
  if (input.file.size < 1 || input.file.size > maxBytes) throw new AppError("FILE_SIZE_INVALID", "File size must be between 1 byte and 10 MB.", 422);
  const stored = await privateStorage().put({ bytes: new Uint8Array(await input.file.arrayBuffer()), originalName: input.file.name, mimeType: input.file.type });
  try {
    return await prisma.$transaction(async (tx) => {
      const document = await tx.document.create({ data: { documentNo: `DOC-${Date.now().toString().slice(-8)}`, candidateId: processingFile.candidateId, fileId: processingFile.id, type: input.type, number: input.number, fileName: input.file.name, expiryDate: input.expiryDate, status: "UPLOADED", version: 1 } });
      const object = await tx.storedObject.create({ data: { ...stored, originalName: input.file.name, mimeType: input.file.type, scanStatus: "Pending", createdBy: session.userId } });
      await tx.documentVersion.create({ data: { documentId: document.id, version: 1, storedObjectId: object.id, uploadedBy: session.userId } });
      await tx.documentHistory.create({ data: { documentId: document.id, action: "UPLOAD", actorId: session.userId, metadata: { size: stored.sizeBytes, checksum: stored.checksum } } });
      await tx.auditLog.create({ data: { userId: session.userId, role: session.user.role.name, module: "Documents", recordId: document.id, action: "UPLOAD", newValue: { documentNo: document.documentNo, type: input.type, version: 1 }, correlationId: crypto.randomUUID() } });
      return document;
    });
  } catch (error) {
    await privateStorage().remove(stored.objectKey).catch(() => {});
    throw error;
  }
}

export async function getPrivateDocument(versionId: string, session: Session) {
  if (!(await can(session, "documents", "View"))) throw new AppError("FORBIDDEN", "Document view permission is required.", 403);
  const version = await prisma.documentVersion.findUnique({ where: { id: versionId }, include: { storedObject: true, document: { include: { file: true } } } });
  if (!version) throw new AppError("NOT_FOUND", "Document version not found.", 404);
  const scope = officeScope(session);
  if ("officeId" in scope && version.document.file?.officeId !== scope.officeId) throw new AppError("FORBIDDEN", "The document is outside your data scope.", 403);
  if (version.storedObject.scanStatus === "Infected") throw new AppError("FILE_BLOCKED", "The document failed the security scan.", 423);
  return { bytes: await privateStorage().get(version.storedObject.objectKey), mimeType: version.storedObject.mimeType, name: version.storedObject.originalName };
}
