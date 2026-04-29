const User = require("../models/User");
const { verifyToken } = require("../services/auth");
const { assertActiveSession, touchSession } = require("../services/sessionService");
const { createApiError } = require("../utils/apiError");

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw createApiError(401, "Authorization bearer token is required", "AUTH_REQUIRED");
    }

    const payload = verifyToken(token);
    const sessionIsActive = await assertActiveSession(payload.sub, payload.sessionToken);
    if (!sessionIsActive) {
      throw createApiError(401, "This login session is no longer active", "SESSION_EXPIRED");
    }

    const user = await User.findById(payload.sub).select("-passwordHash");

    if (!user) {
      throw createApiError(401, "Authenticated user no longer exists", "USER_NOT_FOUND");
    }

    req.user = {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role
    };

    await touchSession(req.user.id, payload.sessionToken);

    next();
  } catch (error) {
    next(error);
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(createApiError(401, "Authentication is required", "AUTH_REQUIRED"));
    }

    if (!roles.includes(req.user.role)) {
      return next(createApiError(403, "You do not have permission for this action", "FORBIDDEN"));
    }

    next();
  };
}

module.exports = { authenticate, requireRole };
