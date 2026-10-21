import "dotenv/config";

// Resolve at request time so signing and verification always use the same loaded environment.
export const getJwtSecret = (guest = false): string => {
  const secret = (guest ? process.env.GUEST_JWT_SECRET : undefined) || process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") throw new Error("JWT_SECRET must be configured");
  return "secret_jwt_key_change_in_production";
};
