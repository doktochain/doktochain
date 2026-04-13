import { APIGatewayProxyEvent } from 'aws-lambda';

let cognitoClient: import('@aws-sdk/client-cognito-identity-provider').CognitoIdentityProviderClient | null = null;

async function getCognitoClient() {
  if (!cognitoClient) {
    const { CognitoIdentityProviderClient } = await import('@aws-sdk/client-cognito-identity-provider');
    cognitoClient = new CognitoIdentityProviderClient({});
  }
  return cognitoClient;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: string;
  groups: string[];
  claims: Record<string, unknown>;
}

export function extractUser(event: APIGatewayProxyEvent): AuthenticatedUser | null {
  const claims = event.requestContext?.authorizer?.claims;
  if (!claims) return null;

  const groups = claims['cognito:groups']
    ? (typeof claims['cognito:groups'] === 'string'
        ? claims['cognito:groups'].split(',')
        : claims['cognito:groups'])
    : [];

  return {
    userId: claims.sub as string,
    email: claims.email as string,
    role: (claims['custom:role'] as string) || groups[0] || 'patient',
    groups: groups as string[],
    claims,
  };
}

export function requireAuth(event: APIGatewayProxyEvent): AuthenticatedUser {
  const user = extractUser(event);
  if (!user) {
    throw new AuthError('Authentication required', 401);
  }
  return user;
}

export function requireRole(event: APIGatewayProxyEvent, ...allowedRoles: string[]): AuthenticatedUser {
  const user = requireAuth(event);
  if (!allowedRoles.includes(user.role) && !user.groups.some(g => allowedRoles.includes(g))) {
    throw new AuthError('Insufficient permissions', 403);
  }
  return user;
}

export class AuthError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 401) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

export async function getUserAttributes(userId: string): Promise<Record<string, string>> {
  const { AdminGetUserCommand } = await import('@aws-sdk/client-cognito-identity-provider');
  const client = await getCognitoClient();

  const command = new AdminGetUserCommand({
    UserPoolId: process.env.COGNITO_USER_POOL_ID!,
    Username: userId,
  });

  const response = await client.send(command);
  const attrs: Record<string, string> = {};
  response.UserAttributes?.forEach(attr => {
    if (attr.Name && attr.Value) {
      attrs[attr.Name] = attr.Value;
    }
  });

  return attrs;
}
