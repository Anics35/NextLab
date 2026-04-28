const User = require("../models/User");
const { verifyToken } = require("../services/auth");
const { createApiError } = require("../utils/apiError");

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw createApiError(401, "Authorization bearer token is required", "AUTH_REQUIRED");
    }

    const payload = verifyToken(token);
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
