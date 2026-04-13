import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
  GoneException,
} from '@aws-sdk/client-apigatewaymanagementapi';
import { withServiceRole } from './db';

let apiClient: ApiGatewayManagementApiClient | null = null;

function getApiClient(): ApiGatewayManagementApiClient {
  if (!apiClient) {
    const endpoint = process.env.WEBSOCKET_API_ENDPOINT;
    if (!endpoint) {
      throw new Error('WEBSOCKET_API_ENDPOINT not configured');
    }
    apiClient = new ApiGatewayManagementApiClient({ endpoint });
  }
  return apiClient;
}

export async function broadcastToUser(userId: string, channel: string, data: unknown): Promise<void> {
  const connections = await withServiceRole(async (client) => {
    const result = await client.query(
      `SELECT connection_id FROM websocket_connections
       WHERE user_id = $1 AND $2 = ANY(channels)`,
      [userId, channel]
    );
    return result.rows.map((r: { connection_id: string }) => r.connection_id);
  });

  const client = getApiClient();
  const payload = JSON.stringify({ channel, data });

  const staleConnections: string[] = [];

  await Promise.allSettled(
    connections.map(async (connectionId: string) => {
      try {
        await client.send(new PostToConnectionCommand({
          ConnectionId: connectionId,
          Data: Buffer.from(payload),
        }));
      } catch (err) {
        if (err instanceof GoneException) {
          staleConnections.push(connectionId);
        } else {
          console.error(`Failed to send to ${connectionId}:`, err);
        }
      }
    })
  );

  if (staleConnections.length > 0) {
    await withServiceRole(async (client) => {
      await client.query(
        `DELETE FROM websocket_connections WHERE connection_id = ANY($1)`,
        [staleConnections]
      );
    });
  }
}

export async function broadcastToChannel(channel: string, data: unknown): Promise<void> {
  const connections = await withServiceRole(async (client) => {
    const result = await client.query(
      `SELECT connection_id FROM websocket_connections WHERE $1 = ANY(channels)`,
      [channel]
    );
    return result.rows.map((r: { connection_id: string }) => r.connection_id);
  });

  const client = getApiClient();
  const payload = JSON.stringify({ channel, data });

  const staleConnections: string[] = [];

  await Promise.allSettled(
    connections.map(async (connectionId: string) => {
      try {
        await client.send(new PostToConnectionCommand({
          ConnectionId: connectionId,
          Data: Buffer.from(payload),
        }));
      } catch (err) {
        if (err instanceof GoneException) {
          staleConnections.push(connectionId);
        } else {
          console.error(`Failed to send to ${connectionId}:`, err);
        }
      }
    })
  );

  if (staleConnections.length > 0) {
    await withServiceRole(async (client) => {
      await client.query(
        `DELETE FROM websocket_connections WHERE connection_id = ANY($1)`,
        [staleConnections]
      );
    });
  }
}
