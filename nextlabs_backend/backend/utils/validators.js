const mongoose = require("mongoose");

function isBlank(value) {
  return typeof value !== "string" || value.trim().length === 0;
}

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

function toStringValue(value, fallback = "") {
  if (value === undefined || value === null) {
    return fallback;
  }

  return String(value);
}

module.exports = { isBlank, isValidObjectId, toStringValue };
