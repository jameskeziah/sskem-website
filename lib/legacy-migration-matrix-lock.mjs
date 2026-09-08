import { createHash, randomBytes } from "node:crypto";
import { mkdir, open, readFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));

export const legacyMigrationCanonicalMatrixPath = path.resolve(projectRoot, "content", "legacy-content-migration-matrix.json");
export const legacyMigrationCanonicalLockPath = path.resolve(projectRoot, "work", "locks", "legacy-content-migration-matrix.lock");

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function legacyMigrationLockPathForMatrix(matrixPath) {
  return path.resolve(matrixPath) === legacyMigrationCanonicalMatrixPath
    ? legacyMigrationCanonicalLockPath
    : `${path.resolve(matrixPath)}.write.lock`;
}

export async function replaceLegacyMigrationFileWithRetry(source, target) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      await rename(source, target);
      return;
    } catch (error) {
      if (!["EACCES", "EBUSY", "ENOTEMPTY", "EPERM"].includes(error?.code) || attempt === 19) throw error;
      await delay(100);
    }
  }
}

export async function acquireLegacyMigrationMatrixLock(options) {
  const lockPath = path.resolve(options.lockPath ?? legacyMigrationLockPathForMatrix(options.matrixPath));
  await mkdir(path.dirname(lockPath), { recursive: true });
  const lockId = randomBytes(12).toString("hex");
  const marker = {
    schemaVersion: 1,
    resourceId: "sskem-legacy-content-migration-matrix",
    lockId,
    operation: options.operation,
    pid: process.pid,
    acquiredAt: options.acquiredAt ?? new Date().toISOString(),
    matrixSha256Before: options.matrixSha256Before ?? null,
    matrixSha256Proposed: options.matrixSha256Proposed ?? null,
    decisionBatchId: options.decisionBatchId ?? null,
  };
  const source = `${JSON.stringify(marker, null, 2)}\n`;
  let handle;
  try {
    handle = await open(lockPath, "wx", 0o600);
  } catch (error) {
    if (error?.code === "EEXIST") {
      const locked = new Error("Another controlled legacy migration matrix write is already in progress. No matrix write was made.");
      locked.code = "MATRIX_LOCK_HELD";
      throw locked;
    }
    throw error;
  }

  try {
    await handle.writeFile(source, "utf8");
    await handle.sync();
  } catch (error) {
    await handle.close().catch(() => {});
    await rm(lockPath, { force: true }).catch(() => {});
    throw error;
  }

  let released = false;
  return {
    lockPath,
    lockId,
    markerFingerprint: sha256(source),
    async release() {
      if (released) return;
      const current = await readFile(lockPath, "utf8");
      let currentMarker;
      try {
        currentMarker = JSON.parse(current);
      } catch {
        const error = new Error("The legacy migration matrix lock marker became unreadable; it was not removed automatically.");
        error.code = "MATRIX_LOCK_OWNERSHIP_LOST";
        throw error;
      }
      if (currentMarker?.lockId !== lockId || sha256(current) !== sha256(source)) {
        const error = new Error("The legacy migration matrix lock no longer matches this writer; it was not removed automatically.");
        error.code = "MATRIX_LOCK_OWNERSHIP_LOST";
        throw error;
      }
      await handle.close();
      await rm(lockPath);
      released = true;
    },
  };
}
