import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';
import { Router } from '../../shared/router';
import { requireAuth } from '../../shared/auth';
import { withRLS } from '../../shared/db';
import {
  success, created, badRequest, notFound,
  parseBody, getOrigin,
} from '../../shared/response';

const secretsClient = new SecretsManagerClient({});
let cachedDailyKey: string | null = null;

async function getDailyApiKey(): Promise<string> {
  if (cachedDailyKey) return cachedDailyKey;
  const command = new GetSecretValueCommand({
    SecretId: process.env.DAILY_API_KEY_ARN!,
  });
  const response = await secretsClient.send(command);
  cachedDailyKey = response.SecretString!;
  return cachedDailyKey;
}

const router = new Router('/telemedicine');

router.post('/room', async (event) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);
  const body = parseBody<{
    appointmentId: string;
    patientId: string;
    providerId: string;
  }>(event.body);

  if (!body.appointmentId) {
    return badRequest('Appointment ID is required', origin);
  }

  const appointment = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const result = await client.query(
      `SELECT * FROM appointments WHERE id = $1 AND appointment_type = 'virtual'`,
      [body.appointmentId]
    );
    return result.rows[0];
  });

  if (!appointment) {
    return notFound('Virtual appointment not found', origin);
  }

  const dailyApiKey = await getDailyApiKey();
  const roomName = `doktochain-${body.appointmentId}-${Date.now()}`;

  const dailyResponse = await fetch('https://api.daily.co/v1/rooms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${dailyApiKey}`,
    },
    body: JSON.stringify({
      name: roomName,
      privacy: 'private',
      properties: {
        enable_chat: true,
        enable_screenshare: true,
        enable_recording: 'cloud',
        max_participants: 2,
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 2),
      },
    }),
  });

  if (!dailyResponse.ok) {
    const errorText = await dailyResponse.text();
    throw new Error(`Daily.co API error: ${errorText}`);
  }

  const roomData = await dailyResponse.json();

  await withRLS(user.userId, user.role, user.claims, async (client) => {
    await client.query(
      `UPDATE appointments SET video_room_id = $1, status = 'in-progress', updated_at = now()
       WHERE id = $2`,
      [roomData.url, body.appointmentId]
    );
  });

  return created({
    roomUrl: roomData.url,
    roomName: roomData.name,
    expiresAt: roomData.config?.exp,
  }, origin);
});

router.get('/room/:appointmentId', async (event, params) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const result = await client.query(
      `SELECT id, video_room_id, status FROM appointments WHERE id = $1`,
      [params.appointmentId]
    );
    return result.rows[0];
  });

  if (!data?.video_room_id) {
    return notFound('Video room not found for this appointment', origin);
  }

  return success({ roomUrl: data.video_room_id, status: data.status }, origin);
});

router.post('/room/:appointmentId/end', async (event, params) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const result = await client.query(
      `UPDATE appointments SET status = 'completed', updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [params.appointmentId]
    );
    return result.rows[0];
  });

  return success(data, origin);
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return router.handle(event);
};
