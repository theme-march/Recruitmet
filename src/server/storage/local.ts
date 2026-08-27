import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, extname, isAbsolute, relative, resolve } from "node:path";
import type { PrivateStorage, StoredInput } from "./types";

const root = resolve(/* turbopackIgnore: true */ process.cwd(), process.env.STORAGE_LOCAL_ROOT || "storage/private");

const resolveKey = (key: string) => {
  const path = resolve(/* turbopackIgnore: true */ root, key);
  const scoped = relative(root, path);
  if (scoped.startsWith("..") || isAbsolute(scoped)) throw new Error("Invalid object key");
  return path;
};

export class LocalPrivateStorage implements PrivateStorage {
  async put(input: StoredInput) {
    const extension = extname(input.originalName).toLowerCase().replace(/[^.a-z0-9]/g, "");
    const now = new Date();
    const objectKey = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${randomUUID()}${extension}`;
    const path = resolveKey(objectKey);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, input.bytes, { flag: "wx" });
    return { objectKey, safeName: objectKey.split("/").at(-1)!, sizeBytes: input.bytes.byteLength, checksum: createHash("sha256").update(input.bytes).digest("hex"), storage: "local" };
  }
  async get(key: string) { return new Uint8Array(await readFile(resolveKey(key))); }
  async remove(key: string) { await unlink(resolveKey(key)); }
}
