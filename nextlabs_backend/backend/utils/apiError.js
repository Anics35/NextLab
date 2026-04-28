function createApiError(status, message, code = "REQUEST_ERROR", details = undefined) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  error.details = details;
  return error;
}

module.exports = { createApiError };
