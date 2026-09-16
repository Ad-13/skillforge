/**
 * Errors that carry an HTTP status and a stable machine-readable code.
 *
 * Throwing these from any layer lets the error middleware translate them
 * into responses, so services and repositories never touch `res`.
 */
export class AppError extends Error {
  readonly status: number
  readonly code: string
  readonly details: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = new.target.name
    this.status = status
    this.code = code
    this.details = details
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details?: unknown) {
    super(400, 'bad_request', message, details)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Not authenticated', details?: unknown) {
    super(401, 'unauthorized', message, details)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', details?: unknown) {
    super(403, 'forbidden', message, details)
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found', details?: unknown) {
    super(404, 'not_found', message, details)
  }
}

export class UpstreamError extends AppError {
  constructor(message = 'Upstream request failed', details?: unknown) {
    super(502, 'upstream_failed', message, details)
  }
}
