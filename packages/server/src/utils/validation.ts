import { ApiErrorResponse, CacheDeleteRequest, CacheGetQuery, CacheSetRequest } from "../types";

interface ValidationSuccess<T> {
  success: true;
  data: T;
}

interface ValidationFailure {
  success: false;
  error: ApiErrorResponse["error"];
}

type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

export function validateCacheGetQuery(query: Partial<CacheGetQuery>): ValidationResult<CacheGetQuery> {
  const prompt = sanitizeString(query.prompt);

  if (!prompt) {
    return validationError("Query parameter 'prompt' is required and must be a non-empty string.");
  }

  return {
    success: true,
    data: { prompt }
  };
}

export function validateCacheSetRequest(
  body: Partial<CacheSetRequest>
): ValidationResult<Required<Pick<CacheSetRequest, "prompt" | "response">> & Pick<CacheSetRequest, "ttl_days">> {
  const prompt = sanitizeString(body.prompt);
  const response = sanitizeString(body.response);

  if (!prompt || !response) {
    return validationError("Fields 'prompt' and 'response' must be non-empty strings.");
  }

  if (body.ttl_days !== undefined) {
    if (!Number.isInteger(body.ttl_days) || body.ttl_days <= 0) {
      return validationError("Field 'ttl_days' must be a positive integer if provided.");
    }
  }

  return {
    success: true,
    data: {
      prompt,
      response,
      ttl_days: body.ttl_days
    }
  };
}

export function validateCacheDeleteRequest(
  body: Partial<CacheDeleteRequest>
): ValidationResult<CacheDeleteRequest> {
  const prompt = sanitizeString(body.prompt);

  if (!prompt) {
    return validationError("Field 'prompt' is required and must be a non-empty string.");
  }

  return {
    success: true,
    data: { prompt }
  };
}

function sanitizeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue ? trimmedValue : null;
}

function validationError(message: string): ValidationFailure {
  return {
    success: false,
    error: {
      code: "VALIDATION_ERROR",
      message
    }
  };
}
