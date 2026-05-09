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
