import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

export type StoredBlob = {
  blobPath: string;
  sha256: string;
  sizeBytes: number;
};

export async function storePrivateBytesLocal(input: {
  tenantId: string;
  caseId: string;
  filename: string;
  bytes: Uint8Array;
}): Promise<StoredBlob> {
  const baseDir = "/tmp/pixdrift-private-blob";
  const sha256 = createHash("sha256").update(input.bytes).digest("hex");
  const safeName = input.filename.replaceAll(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "file";
  const dir = path.join(baseDir, input.tenantId, input.caseId);
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${sha256}_${safeName}`);
  await writeFile(filePath, input.bytes);
  return { blobPath: `local:${filePath}`, sha256, sizeBytes: input.bytes.byteLength };
}

