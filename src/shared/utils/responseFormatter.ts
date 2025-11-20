interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

interface ErrorResponse {
  success: false;
  message: string;
  details?: unknown;
}

export function formatSuccess<T>(
  data: T,
  message?: string,
): SuccessResponse<T> {
  return typeof message === "string"
    ? { success: true, data, message }
    : { success: true, data };
}

export function formatError(message: string, details?: unknown): ErrorResponse {
  return typeof details !== "undefined"
    ? { success: false, message, details }
    : { success: false, message };
}

