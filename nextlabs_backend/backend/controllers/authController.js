const User = require("../models/User");
const { hashPassword, signToken, verifyPassword } = require("../services/auth");
const { createActiveSession } = require("../services/sessionService");
const { createApiError } = require("../utils/apiError");
const { isBlank } = require("../utils/validators");

function toAuthResponse(user, token) {
  return {
    success: true,
    token,
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      rollNumber: user.rollNumber,
      semester: user.semester,
      phone: user.phone
    }
  };
}

async function register(req, res, next) {
  try {
    const { name, email, password, role = "student", rollNumber, semester } = req.body;

    if (isBlank(name) || isBlank(email) || isBlank(password)) {
      throw createApiError(400, "name, email and password are required", "MISSING_FIELDS");
    }

    if (password.length < 6) {
      throw createApiError(400, "password must be at least 6 characters", "WEAK_PASSWORD");
    }

    if (!["student", "teacher"].includes(role)) {
      throw createApiError(400, "role must be student or teacher", "INVALID_ROLE");
    }

    if (role === "student" && (isBlank(rollNumber) || isBlank(semester))) {
      throw createApiError(400, "rollNumber and semester are required for students", "MISSING_STUDENT_FIELDS");
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      throw createApiError(409, "Email is already registered", "EMAIL_EXISTS");
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: hashPassword(password),
      role,
      rollNumber: role === "student" ? String(rollNumber).trim() : undefined,
      semester: role === "student" ? String(semester).trim() : undefined
    });

    const sessionToken = await createActiveSession(user._id);
    res.status(201).json(toAuthResponse(user, signToken(user, sessionToken)));
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (isBlank(email) || isBlank(password)) {
      throw createApiError(400, "email and password are required", "MISSING_FIELDS");
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      throw createApiError(401, "Invalid email or password", "INVALID_CREDENTIALS");
    }

    const sessionToken = await createActiveSession(user._id);
    res.json(toAuthResponse(user, signToken(user, sessionToken)));
  } catch (error) {
    next(error);
  }
}

function me(req, res) {
  res.json({
    success: true,
    user: req.user
  });
}

async function updateProfile(req, res, next) {
  try {
    const { name, phone, rollNumber, semester } = req.body;
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      throw createApiError(401, "Unauthorized", "UNAUTHORIZED");
    }

    const user = await User.findById(userId);
    if (!user) {
      throw createApiError(404, "User not found", "USER_NOT_FOUND");
    }

    // Update allowed fields
    if (name && name.trim()) {
      user.name = name.trim();
    }
    if (typeof phone === 'string') {
      user.phone = phone.trim();
    }
    if (user.role === 'student') {
      if (rollNumber && String(rollNumber).trim()) {
        user.rollNumber = String(rollNumber).trim();
      }
      if (semester && String(semester).trim()) {
        user.semester = String(semester).trim();
      }
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        rollNumber: user.rollNumber,
        semester: user.semester,
        phone: user.phone
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { login, me, register, updateProfile };
