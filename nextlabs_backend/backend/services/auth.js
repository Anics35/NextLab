const crypto = require("crypto");
const { createApiError } = require("../utils/apiError");

const TOKEN_TTL_SECONDS = 24 * 60 * 60;

function base64UrlEncode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function base64UrlDecode(value) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw createApiError(500, "JWT_SECRET is not configured", "AUTH_CONFIG_MISSING");
  }

  return secret;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, originalHash] = storedHash.split(":");

  if (!salt || !originalHash) {
    return false;
  }

  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(originalHash, "hex"));
}

function signToken(user, sessionToken = undefined) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    rollNumber: user.rollNumber,
    semester: user.semester,
    sessionToken,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS
  };

  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(payload);
  const signature = crypto
    .createHmac("sha256", getJwtSecret())
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function verifyToken(token) {
  const parts = String(token).split(".");

  if (parts.length !== 3) {
    throw createApiError(401, "Invalid authentication token", "INVALID_TOKEN");
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const expectedSignature = crypto
    .createHmac("sha256", getJwtSecret())
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    throw createApiError(401, "Invalid authentication token", "INVALID_TOKEN");
  }

  const payload = base64UrlDecode(encodedPayload);

  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw createApiError(401, "Authentication token expired", "TOKEN_EXPIRED");
  }

  return payload;
}

module.exports = { hashPassword, signToken, verifyPassword, verifyToken };
