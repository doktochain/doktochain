import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Router } from '../../shared/router';
import { requireAuth } from '../../shared/auth';
import { withRLS } from '../../shared/db';
import { broadcastToUser } from '../../shared/websocket';
import {
  success, created, noContent,
  parseBody, getOrigin, getQueryParam,
} from '../../shared/response';

const router = new Router('/messaging');

router.get('/conversations', async (event) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const result = await client.query(
      `SELECT DISTINCT ON (conversation_id)
        m.conversation_id, m.message_text as last_message, m.created_at as last_message_at,
        m.sender_id, m.recipient_id,
        json_build_object('first_name', sup.first_name, 'last_name', sup.last_name, 'profile_photo_url', sup.profile_photo_url) as sender,
        json_build_object('first_name', rup.first_name, 'last_name', rup.last_name, 'profile_photo_url', rup.profile_photo_url) as receiver
       FROM messages m
       LEFT JOIN user_profiles sup ON m.sender_id = sup.id
       LEFT JOIN user_profiles rup ON m.recipient_id = rup.id
       WHERE m.sender_id = $1 OR m.recipient_id = $1
       ORDER BY conversation_id, m.created_at DESC`,
      [user.userId]
    );
    return result.rows;
  });

  return success(data, origin);
});

router.get('/messages', async (event) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);
  const conversationId = getQueryParam(event.queryStringParameters, 'conversation_id');
  const otherUserId = getQueryParam(event.queryStringParameters, 'other_user_id');

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    let query = `
      SELECT m.*, json_build_object('first_name', up.first_name, 'last_name', up.last_name) as sender_info
      FROM messages m
      LEFT JOIN user_profiles up ON m.sender_id = up.id
      WHERE (m.sender_id = $1 OR m.recipient_id = $1)
    `;
    const params: unknown[] = [user.userId];
    let paramIndex = 2;

    if (conversationId) {
      query += ` AND m.conversation_id = $${paramIndex}`;
      params.push(conversationId);
      paramIndex++;
    } else if (otherUserId) {
      query += ` AND (m.sender_id = $${paramIndex} OR m.recipient_id = $${paramIndex})`;
      params.push(otherUserId);
      paramIndex++;
    }

    query += ` ORDER BY m.created_at ASC LIMIT 200`;
    const result = await client.query(query, params);
    return result.rows;
  });

  return success(data, origin);
});

router.post('/messages', async (event) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);
  const body = parseBody<{
    receiver_id: string;
    content: string;
    conversation_id?: string;
    message_type?: string;
  }>(event.body);

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const result = await client.query(
      `INSERT INTO messages (sender_id, recipient_id, message_text${body.conversation_id ? ', conversation_id' : ''})
       VALUES ($1, $2, $3${body.conversation_id ? ', $4' : ''})
       RETURNING *`,
      body.conversation_id
        ? [user.userId, body.receiver_id, body.content, body.conversation_id]
        : [user.userId, body.receiver_id, body.content]
    );

    await client.query(
      `INSERT INTO notifications (user_id, title, message, notification_type, is_read)
       VALUES ($1, 'New Message', $2, 'message', false)`,
      [body.receiver_id, `You have a new message`]
    );

    return result.rows[0];
  });

  try {
    await broadcastToUser(body.receiver_id, 'messages', data);
    await broadcastToUser(body.receiver_id, 'notifications', {
      type: 'message',
      title: 'New Message',
    });
  } catch (err) {
    console.error('WebSocket broadcast failed (non-fatal):', err);
  }

  return created(data, origin);
});

router.get('/notifications', async (event) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);
  const unreadOnly = getQueryParam(event.queryStringParameters, 'unread');

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    let query = `SELECT * FROM notifications WHERE user_id = $1`;
    const params: unknown[] = [user.userId];

    if (unreadOnly === 'true') {
      query += ` AND is_read = false`;
    }

    query += ` ORDER BY created_at DESC LIMIT 100`;
    const result = await client.query(query, params);
    return result.rows;
  });

  return success(data, origin);
});

router.put('/notifications/:id/read', async (event, params) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);

  await withRLS(user.userId, user.role, user.claims, async (client) => {
    await client.query(
      `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2`,
      [params.id, user.userId]
    );
  });

  return noContent(origin);
});

router.put('/notifications/read-all', async (event) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);

  await withRLS(user.userId, user.role, user.claims, async (client) => {
    await client.query(
      `UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false`,
      [user.userId]
    );
  });

  return noContent(origin);
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return router.handle(event);
};
