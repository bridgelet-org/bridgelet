import { Buffer } from "buffer";

const JWT_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const MAX_TOKEN_LENGTH = 2048;
const MIN_TOKEN_LENGTH = 40;

export type ClaimTokenErrorCode =
  | "INVALID_TOKEN_FORMAT"
  | "TOKEN_TOO_LONG"
  | "TOKEN_TOO_SHORT"
  | "TOKEN_EXPIRED";

export class ClaimTokenError extends Error {
  readonly code: ClaimTokenErrorCode;

  constructor(code: ClaimTokenErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export type ClaimTokenPayload = {
  accountId?: string;
  amount?: string;
  asset?: string;
  expiresAt?: string;
  exp?: number;
  iat?: number;
};

const toBase64 = (base64Url: string): string => {
  const normalized = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const paddingLength = (4 - (normalized.length % 4)) % 4;
  return normalized + "=".repeat(paddingLength);
};

const decodeBase64Url = (segment: string): string => {
  return Buffer.from(toBase64(segment), "base64").toString("utf-8");
};

export const sanitizeTokenInput = (value: string): string => {
  const trimmed = value.trim();
  const urlMatch = trimmed.match(/\/c\/([^/?#\s]+)/i);
  if (urlMatch?.[1]) {
    return decodeURIComponent(urlMatch[1]).trim();
  }
  return trimmed;
};

export const decodeClaimTokenPayload = (token: string): ClaimTokenPayload => {
  const segments = token.split(".");
  if (segments.length !== 3) {
    throw new ClaimTokenError(
      "INVALID_TOKEN_FORMAT",
      "Invalid claim link format.",
    );
  }

  try {
    const payload = decodeBase64Url(segments[1]);
    return JSON.parse(payload) as ClaimTokenPayload;
  } catch {
    throw new ClaimTokenError(
      "INVALID_TOKEN_FORMAT",
      "Invalid claim link format.",
    );
  }
};

export const validateClaimToken = (token: string): void => {
  if (!token) {
    throw new ClaimTokenError(
      "INVALID_TOKEN_FORMAT",
      "Please enter a claim token.",
    );
  }

  if (token.length > MAX_TOKEN_LENGTH) {
    throw new ClaimTokenError(
      "TOKEN_TOO_LONG",
      "Token is too long. Please check the link.",
    );
  }

  if (token.length < MIN_TOKEN_LENGTH) {
    throw new ClaimTokenError(
      "TOKEN_TOO_SHORT",
      "Token is too short. Please check the link.",
    );
  }

  if (!JWT_PATTERN.test(token)) {
    throw new ClaimTokenError(
      "INVALID_TOKEN_FORMAT",
      "Invalid claim link format.",
    );
  }

  const payload = decodeClaimTokenPayload(token);
  if (typeof payload.exp === "number") {
    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp <= nowInSeconds) {
      throw new ClaimTokenError(
        "TOKEN_EXPIRED",
        "This claim link has expired.",
      );
    }
  }
};

export const getClaimTokenErrorMessage = (error: unknown): string => {
  if (error instanceof ClaimTokenError) {
    return error.message;
  }

  return "Unable to verify this claim token. Please try again.";
};

export const claimIdFromQrValue = (value: string): string | null => {
  const token = sanitizeTokenInput(value);
  try {
    validateClaimToken(token);
    return token;
  } catch {
    return null;
  }
};
