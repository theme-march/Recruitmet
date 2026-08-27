import "server-only";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { createHash, randomUUID } from "node:crypto";
import { extname } from "node:path";
import type { PrivateStorage, StoredInput } from "./types";
import { AppError } from "@/lib/errors";
export class S3PrivateStorage implements PrivateStorage {
  private bucket: string;
  private client: S3Client;
  constructor() {
    const endpoint = process.env.S3_ENDPOINT,
      bucket = process.env.S3_BUCKET,
      accessKeyId = process.env.S3_ACCESS_KEY_ID,
      secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    if (!endpoint || !bucket || !accessKeyId || !secretAccessKey)
      throw new AppError(
        "STORAGE_CONFIGURATION_ERROR",
        "Production object storage is not configured.",
        503,
      );
    this.bucket = bucket;
    this.client = new S3Client({
      endpoint,
      region: process.env.S3_REGION || "auto",
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  async put(input: StoredInput) {
    const extension = extname(input.originalName)
      .toLowerCase()
      .replace(/[^.a-z0-9]/g, "");
    const objectKey = `private/${new Date().getUTCFullYear()}/${randomUUID()}${extension}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        Body: input.bytes,
        ContentType: input.mimeType,
        ServerSideEncryption: "AES256",
      }),
    );
    return {
      objectKey,
      safeName: objectKey.split("/").at(-1)!,
      sizeBytes: input.bytes.byteLength,
      checksum: createHash("sha256").update(input.bytes).digest("hex"),
      storage: "s3",
    };
  }
  async get(objectKey: string) {
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: objectKey }),
    );
    if (!result.Body)
      throw new AppError(
        "FILE_NOT_FOUND",
        "Stored document is unavailable.",
        404,
      );
    return new Uint8Array(await result.Body.transformToByteArray());
  }
  async remove(objectKey: string) {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: objectKey }),
    );
  }
}
