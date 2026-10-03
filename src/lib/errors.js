export class ApiError extends Error {
  constructor(message, status, code = null, data = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

export class AuthError extends ApiError {
  constructor(message, status = 401, code = status === 403 ? "FORBIDDEN" : "UNAUTHORIZED", data = null) {
    super(message, status, code, data);
  }
}

export class ValidationError extends ApiError {
  constructor(message, code = "VALIDATION_ERROR", data = null) {
    super(message, 400, code, data);
  }
}

export class NotFoundError extends ApiError {
  constructor(message = "Resource not found") {
    super(message, 404, "NOT_FOUND");
  }
}

export class ConflictError extends ApiError {
  constructor(message, code, data = null) {
    super(message, 409, code, data);
  }
}
