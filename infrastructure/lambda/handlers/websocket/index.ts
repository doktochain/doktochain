import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { withServiceRole, query } from '../../shared/db';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const routeKey = (event.requestContext as any).routeKey;
  const connectionId = (event.requestContext as any).connectionId;

  try {
    switch (routeKey) {
      case '$connect': {
        const userId = (event.requestContext as any).authorizer?.principalId;

        if (!userId) {
          return { statusCode: 401, body: 'Unauthorized' };
        }

        await withServiceRole(async (client) => {
          await client.query(
            `INSERT INTO websocket_connections (connection_id, user_id)
             VALUES ($1, $2)
             ON CONFLICT (connection_id) DO UPDATE SET user_id = $2, connected_at = now()`,
            [connectionId, userId]
          );
        });

        return { statusCode: 200, body: 'Connected' };
      }

      case '$disconnect': {
        await withServiceRole(async (client) => {
          await client.query(
            `DELETE FROM websocket_connections WHERE connection_id = $1`,
            [connectionId]
          );
        });
        return { statusCode: 200, body: 'Disconnected' };
      }

      case '$default': {
        const body = JSON.parse(event.body || '{}');
        const action = body.action;

        if (action === 'ping') {
          return { statusCode: 200, body: JSON.stringify({ action: 'pong' }) };
        }

        if (action === 'subscribe') {
          const channel = body.channel;
          if (channel) {
            await withServiceRole(async (client) => {
              await client.query(
                `UPDATE websocket_connections
                 SET channels = array_append(channels, $1)
                 WHERE connection_id = $2 AND NOT ($1 = ANY(channels))`,
                [channel, connectionId]
              );
            });
          }
          return { statusCode: 200, body: JSON.stringify({ subscribed: channel }) };
        }

        if (action === 'unsubscribe') {
          const channel = body.channel;
          if (channel) {
            await withServiceRole(async (client) => {
              await client.query(
                `UPDATE websocket_connections
                 SET channels = array_remove(channels, $1)
                 WHERE connection_id = $2`,
                [channel, connectionId]
              );
            });
          }
          return { statusCode: 200, body: JSON.stringify({ unsubscribed: channel }) };
        }

        return { statusCode: 200, body: JSON.stringify({ message: 'Unknown action' }) };
      }

      default:
        return { statusCode: 400, body: 'Unknown route' };
    }
  } catch (err) {
    console.error('WebSocket handler error:', err);
    return { statusCode: 500, body: 'Internal error' };
  }
};
