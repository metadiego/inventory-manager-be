import * as functions from 'firebase-functions';

/**
 * Custom error class for API-specific errors
 * @class ApiError
 * @extends Error
 */
export class ApiError extends Error {
  /**
   * Creates an instance of ApiError
   * @param {number} statusCode - HTTP status code for the error
   * @param {string} message - Error message
   */
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Handles errors by converting them to Firebase HttpsError format
 * @param {unknown} error - The error to handle
 * @return {functions.https.HttpsError} Formatted Firebase HttpsError
 */
export const errorHandler = (error: unknown) => {
  if (error instanceof ApiError) {
    return new functions.https.HttpsError('invalid-argument', error.message);
  }

  console.error('Unexpected error:', error);
  return new functions.https.HttpsError(
    'internal',
    'An unexpected error occurred');
};
