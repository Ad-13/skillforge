import type { ErrorRequestHandler, RequestHandler } from 'express'
import { AppError, NotFoundError } from '../lib/errors.ts'
import { env } from '../config/env.ts'

export const asyncHandler =
  (handler: RequestHandler): RequestHandler =>
  (req, res, next) => {
    void Promise.resolve(handler(req, res, next)).catch(next)
  }

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new NotFoundError('Route not found'))
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof AppError) {
    res.status(error.status).json({
      error: error.code,
      message: error.message,
      ...(error.details !== undefined && !env.isProduction ? { details: error.details } : {}),
    })
    return
  }

  console.error('[skillforge] unhandled error:', error)

  res.status(500).json({
    error: 'internal_error',
    message: 'Something went wrong',
  })
}
