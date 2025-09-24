// Error types for Blockfrost API client

// Base error class for all Blockfrost API errors
export class BlockfrostError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly endpoint?: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = 'BlockfrostError';
  }
}

// Specific error types for common HTTP status codes
export class BlockfrostBadRequestError extends BlockfrostError {
  constructor(message: string, endpoint?: string, originalError?: unknown) {
    super(message, 400, endpoint, originalError);
    this.name = 'BlockfrostBadRequestError';
  }
}

export class BlockfrostPaymentRequiredError extends BlockfrostError {
  constructor(message: string, endpoint?: string, originalError?: unknown) {
    super(message, 402, endpoint, originalError);
    this.name = 'BlockfrostPaymentRequiredError';
  }
}

export class BlockfrostUnauthorizedError extends BlockfrostError {
  constructor(message: string, endpoint?: string, originalError?: unknown) {
    super(message, 403, endpoint, originalError);
    this.name = 'BlockfrostUnauthorizedError';
  }
}

export class BlockfrostNotFoundError extends BlockfrostError {
  constructor(message: string, endpoint?: string, originalError?: unknown) {
    super(message, 404, endpoint, originalError);
    this.name = 'BlockfrostNotFoundError';
  }
}

export class BlockfrostAutoBannedError extends BlockfrostError {
  constructor(message: string, endpoint?: string, originalError?: unknown) {
    super(message, 418, endpoint, originalError);
    this.name = 'BlockfrostAutoBannedError';
  }
}

export class BlockfrostQueueFullError extends BlockfrostError {
  constructor(message: string, endpoint?: string, originalError?: unknown) {
    super(message, 425, endpoint, originalError);
    this.name = 'BlockfrostQueueFullError';
  }
}

export class BlockfrostRateLimitError extends BlockfrostError {
  constructor(message: string, endpoint?: string, originalError?: unknown) {
    super(message, 429, endpoint, originalError);
    this.name = 'BlockfrostRateLimitError';
  }
}

export class BlockfrostServerError extends BlockfrostError {
  constructor(message: string, endpoint?: string, originalError?: unknown) {
    super(message, 500, endpoint, originalError);
    this.name = 'BlockfrostServerError';
  }
}

export class NetworkError extends BlockfrostError {
  constructor(message: string, endpoint?: string, originalError?: unknown) {
    super(message, undefined, endpoint, originalError);
    this.name = 'NetworkError';
  }
}

// Factory function to create appropriate error based on status code
export function createBlockfrostError(
  statusCode: number,
  message: string,
  endpoint?: string,
  originalError?: unknown,
): BlockfrostError {
  switch (statusCode) {
    case 400:
      return new BlockfrostBadRequestError(message, endpoint, originalError);
    case 402:
      return new BlockfrostPaymentRequiredError(message, endpoint, originalError);
    case 403:
      return new BlockfrostUnauthorizedError(message, endpoint, originalError);
    case 404:
      return new BlockfrostNotFoundError(message, endpoint, originalError);
    case 418:
      return new BlockfrostAutoBannedError(message, endpoint, originalError);
    case 425:
      return new BlockfrostQueueFullError(message, endpoint, originalError);
    case 429:
      return new BlockfrostRateLimitError(message, endpoint, originalError);
    case 500:
      return new BlockfrostServerError(message, endpoint, originalError);
    default:
      return new BlockfrostError(message, statusCode, endpoint, originalError);
  }
}
