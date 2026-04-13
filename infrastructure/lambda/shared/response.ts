import { APIGatewayProxyResult } from 'aws-lambda';

const ALLOWED_ORIGINS = process.env.ENVIRONMENT === 'production'
  ? ['https://doktochain.ca', 'https://www.doktochain.ca']
  : ['https://staging.doktochain.ca', 'http://localhost:5173'];

function getCorsOrigin(requestOrigin?: string): string {
  if (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)) {
    return requestOrigin;
  }
  return ALLOWED_ORIGINS[0];
}

function corsHeaders(origin?: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': getCorsOrigin(origin),
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  };
}

export function success(body: unknown, origin?: string, statusCode = 200): APIGatewayProxyResult {
  return {
    statusCode,
    headers: corsHeaders(origin),
    body: JSON.stringify(body),
  };
}

export function created(body: unknown, origin?: string): APIGatewayProxyResult {
  return success(body, origin, 201);
}

export function noContent(origin?: string): APIGatewayProxyResult {
  return {
    statusCode: 204,
    headers: corsHeaders(origin),
    body: '',
  };
}

export function error(
  message: string,
  statusCode = 500,
  origin?: string,
  details?: unknown
): APIGatewayProxyResult {
  const body: Record<string, unknown> = { error: message };
  if (details && process.env.ENVIRONMENT !== 'production') {
    body.details = details;
  }
  return {
    statusCode,
    headers: corsHeaders(origin),
    body: JSON.stringify(body),
  };
}

export function badRequest(message: string, origin?: string): APIGatewayProxyResult {
  return error(message, 400, origin);
}

export function unauthorized(message = 'Authentication required', origin?: string): APIGatewayProxyResult {
  return error(message, 401, origin);
}

export function forbidden(message = 'Insufficient permissions', origin?: string): APIGatewayProxyResult {
  return error(message, 403, origin);
}

export function notFound(message = 'Resource not found', origin?: string): APIGatewayProxyResult {
  return error(message, 404, origin);
}

export class ClientError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'ClientError';
    this.statusCode = statusCode;
  }
}

export function parseBody<T>(body: string | null): T {
  if (!body) throw new ClientError('Request body is required');
  try {
    return JSON.parse(body) as T;
  } catch {
    throw new ClientError('Invalid JSON in request body');
  }
}

export function getOrigin(headers: Record<string, string | undefined>): string | undefined {
  return headers?.origin || headers?.Origin;
}

export function getQueryParam(
  params: Record<string, string | undefined> | null,
  key: string
): string | undefined {
  return params?.[key];
}

export function getPathParam(
  params: Record<string, string | undefined> | null,
  key: string
): string {
  const value = params?.[key];
  if (!value) throw new ClientError(`Path parameter '${key}' is required`);
  return value;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateUUID(value: string, fieldName = 'id'): string {
  if (!UUID_REGEX.test(value)) {
    throw new ClientError(`Invalid UUID format for '${fieldName}'`);
  }
  return value;
}

export function requireUUIDParam(
  params: Record<string, string | undefined> | null,
  key: string
): string {
  const value = getPathParam(params, key);
  return validateUUID(value, key);
}
