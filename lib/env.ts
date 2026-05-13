/**
 * Validated environment constants.
 * Fail fast on boot if required env vars are missing.
 */

const v1UserUuid = process.env.NEXT_PUBLIC_V1_USER_UUID;

if (!v1UserUuid) {
  throw new Error(
    "NEXT_PUBLIC_V1_USER_UUID is required. Set it in .env.local"
  );
}

export const DEFAULT_OWNER = v1UserUuid;

export function getMinVarLength(): number {
  const raw = process.env.MIN_VAR_LENGTH;
  if (!raw) return 1;
  const n = parseInt(raw, 10);
  return Number.isNaN(n) ? 1 : n;
}

export function getMaxVarLength(): number {
  const raw = process.env.MAX_VAR_LENGTH;
  if (!raw) return 4000;
  const n = parseInt(raw, 10);
  return Number.isNaN(n) ? 4000 : n;
}
