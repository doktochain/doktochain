import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  InitiateAuthCommand,
  GlobalSignOutCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  AdminAddUserToGroupCommand,
  AdminUpdateUserAttributesCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { Router } from '../../shared/router';
import { withServiceRole } from '../../shared/db';
import { success, created, badRequest, parseBody, getOrigin, notFound } from '../../shared/response';

const cognitoClient = new CognitoIdentityProviderClient({});
const userPoolId = process.env.COGNITO_USER_POOL_ID!;
const clientId = process.env.COGNITO_CLIENT_ID!;

const router = new Router('/auth');

router.post('/register', async (event) => {
  const origin = getOrigin(event.headers);
  const body = parseBody<{
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role?: string;
  }>(event.body);

  if (!body.email || !body.password || !body.firstName || !body.lastName) {
    return badRequest('Email, password, first name, and last name are required', origin);
  }

  const role = body.role || 'patient';
  const validRoles = ['patient', 'provider', 'pharmacy'];
  if (!validRoles.includes(role)) {
    return badRequest('Invalid role', origin);
  }

  const signUpCommand = new SignUpCommand({
    ClientId: clientId,
    Username: body.email,
    Password: body.password,
    UserAttributes: [
      { Name: 'email', Value: body.email },
      { Name: 'given_name', Value: body.firstName },
      { Name: 'family_name', Value: body.lastName },
      ...(body.phone ? [{ Name: 'phone_number', Value: body.phone }] : []),
      { Name: 'custom:role', Value: role },
    ],
  });

  const signUpResult = await cognitoClient.send(signUpCommand);
  const userId = signUpResult.UserSub!;

  const addToGroupCommand = new AdminAddUserToGroupCommand({
    UserPoolId: userPoolId,
    Username: body.email,
    GroupName: role,
  });
  await cognitoClient.send(addToGroupCommand);

  await withServiceRole(async (client) => {
    await client.query(
      `INSERT INTO user_profiles (id, email, first_name, last_name, phone, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [userId, body.email, body.firstName, body.lastName, body.phone || null, role]
    );

    if (role === 'patient') {
      await client.query(
        `INSERT INTO patients (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      );
    } else if (role === 'provider') {
      await client.query(
        `INSERT INTO providers (user_id, is_active, is_verified)
         VALUES ($1, false, false) ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      );
    }
  });

  return created({ userId, email: body.email, role }, origin);
});

router.post('/login', async (event) => {
  const origin = getOrigin(event.headers);
  const body = parseBody<{ email: string; password: string }>(event.body);

  if (!body.email || !body.password) {
    return badRequest('Email and password are required', origin);
  }

  const command = new InitiateAuthCommand({
    ClientId: clientId,
    AuthFlow: 'USER_PASSWORD_AUTH',
    AuthParameters: {
      USERNAME: body.email,
      PASSWORD: body.password,
    },
  });

  const result = await cognitoClient.send(command);
  const authResult = result.AuthenticationResult;

  if (!authResult) {
    return badRequest('Authentication failed', origin);
  }

  const idTokenPayload = JSON.parse(
    Buffer.from(authResult.IdToken!.split('.')[1], 'base64').toString()
  );

  const user = {
    id: idTokenPayload.sub,
    email: idTokenPayload.email,
    role: idTokenPayload['custom:role'] || 'patient',
    groups: idTokenPayload['cognito:groups'] || [],
  };

  return success({
    user,
    tokens: {
      idToken: authResult.IdToken,
      accessToken: authResult.AccessToken,
      refreshToken: authResult.RefreshToken,
    },
    expiresIn: authResult.ExpiresIn,
  }, origin);
});

router.post('/refresh', async (event) => {
  const origin = getOrigin(event.headers);
  const body = parseBody<{ refreshToken: string }>(event.body);

  const command = new InitiateAuthCommand({
    ClientId: clientId,
    AuthFlow: 'REFRESH_TOKEN_AUTH',
    AuthParameters: {
      REFRESH_TOKEN: body.refreshToken,
    },
  });

  const result = await cognitoClient.send(command);
  const authResult = result.AuthenticationResult;

  return success({
    accessToken: authResult?.AccessToken,
    idToken: authResult?.IdToken,
    expiresIn: authResult?.ExpiresIn,
  }, origin);
});

router.post('/logout', async (event) => {
  const origin = getOrigin(event.headers);
  const token = event.headers.Authorization?.replace('Bearer ', '');

  if (token) {
    const command = new GlobalSignOutCommand({ AccessToken: token });
    await cognitoClient.send(command);
  }

  return success({ message: 'Logged out successfully' }, origin);
});

router.post('/forgot-password', async (event) => {
  const origin = getOrigin(event.headers);
  const body = parseBody<{ email: string }>(event.body);

  const command = new ForgotPasswordCommand({
    ClientId: clientId,
    Username: body.email,
  });

  await cognitoClient.send(command);

  return success({ message: 'Password reset code sent' }, origin);
});

router.post('/reset-password', async (event) => {
  const origin = getOrigin(event.headers);
  const body = parseBody<{ email: string; code: string; newPassword: string }>(event.body);

  const command = new ConfirmForgotPasswordCommand({
    ClientId: clientId,
    Username: body.email,
    ConfirmationCode: body.code,
    Password: body.newPassword,
  });

  await cognitoClient.send(command);

  return success({ message: 'Password reset successfully' }, origin);
});

router.get('/me', async (event) => {
  const origin = getOrigin(event.headers);
  
  // Manually decode token since /auth routes have no Cognito authorizer
  const authHeader = event.headers.Authorization || event.headers.authorization;
  if (!authHeader) return badRequest('Authorization header required', origin);
  
  const token = authHeader.replace('Bearer ', '');
  
  let userId: string;
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    userId = payload.sub;
    if (!userId) throw new Error('No sub');
  } catch {
    return badRequest('Invalid token', origin);
  }

  const data = await withServiceRole(async (client) => {
    const result = await client.query(
      `SELECT * FROM user_profiles WHERE id = $1`,
      [userId]
    );
    return result.rows[0] || null;
  });

  if (!data) return notFound('Profile not found', origin);
  return success(data, origin);
});

router.put('/me', async (event) => {
  const origin = getOrigin(event.headers);

  const authHeader = event.headers.Authorization || event.headers.authorization;
  if (!authHeader) return badRequest('Authorization header required', origin);

  const token = authHeader.replace('Bearer ', '');

  let userId: string;
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    userId = payload.sub;
    if (!userId) throw new Error('No sub');
  } catch {
    return badRequest('Invalid token', origin);
  }

  const body = parseBody<Record<string, unknown>>(event.body);

  const allowedFields = [
    'first_name', 'last_name', 'phone', 'date_of_birth',
    'gender', 'address_line1', 'address_line2', 'city',
    'province', 'postal_code', 'country', 'profile_photo_url',
    'language_preference',
  ];

  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates.push(`${field} = $${paramIndex}`);
      values.push(body[field]);
      paramIndex++;
    }
  }

  if (updates.length === 0) return badRequest('No valid fields to update', origin);

  values.push(userId);

  const data = await withServiceRole(async (client) => {
    const result = await client.query(
      `UPDATE user_profiles SET ${updates.join(', ')}, updated_at = now()
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );
    return result.rows[0];
  });

  return success(data, origin);
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return router.handle(event);
};
