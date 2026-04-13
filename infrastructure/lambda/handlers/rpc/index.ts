import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { extractUser } from '../../shared/auth';
import { withRLS } from '../../shared/db';
import {
  success, badRequest, error,
  parseBody, getOrigin,
} from '../../shared/response';

const RPC_HANDLERS: Record<string, (client: any, params: any) => Promise<any>> = {
  increment_template_usage: async (client, params) => {
    const { template_id } = params;
    await client.query(
      `UPDATE message_templates SET usage_count = COALESCE(usage_count, 0) + 1 WHERE id = $1`,
      [template_id]
    );
    return { success: true };
  },

  increment_article_count: async (client, params) => {
    const { article_id } = params;
    await client.query(
      `UPDATE help_articles SET view_count = COALESCE(view_count, 0) + 1 WHERE id = $1`,
      [article_id]
    );
    return { success: true };
  },

  'increment-download-count': async (client, params) => {
    const { file_id } = params;
    await client.query(
      `UPDATE session_files SET download_count = COALESCE(download_count, 0) + 1 WHERE id = $1`,
      [file_id]
    );
    return { success: true };
  },

  check_user_permission: async (client, params) => {
    const { user_id, permission_name } = params;
    const result = await client.query(
      `SELECT EXISTS(
        SELECT 1 FROM user_custom_roles ucr
        JOIN custom_role_permissions crp ON ucr.role_id = crp.role_id
        JOIN staff_permissions sp ON crp.permission_id = sp.id
        WHERE ucr.user_id = $1 AND sp.permission_name = $2
      ) as has_permission`,
      [user_id, permission_name]
    );
    return { has_permission: result.rows[0]?.has_permission || false };
  },

  get_user_accessible_paths: async (client, params) => {
    const { user_id } = params;
    const result = await client.query(
      `SELECT DISTINCT sp.permission_name
       FROM user_custom_roles ucr
       JOIN custom_role_permissions crp ON ucr.role_id = crp.role_id
       JOIN staff_permissions sp ON crp.permission_id = sp.id
       WHERE ucr.user_id = $1`,
      [user_id]
    );
    return result.rows.map((r: any) => r.permission_name);
  },
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const origin = getOrigin(event.headers);

  if (event.httpMethod === 'OPTIONS') {
    return success(null, origin);
  }

  if (event.httpMethod !== 'POST') {
    return badRequest('RPC endpoints only accept POST requests', origin);
  }

  try {
    const user = extractUser(event);
    if (!user) {
      return error('Authentication required', 401, origin);
    }

    const path = event.path || '';
    const funcMatch = path.match(/^\/rpc\/(.+)$/);
    if (!funcMatch) {
      return badRequest('Invalid RPC path. Expected /rpc/{function_name}', origin);
    }

    const funcName = funcMatch[1];
    const rpcHandler = RPC_HANDLERS[funcName];

    if (!rpcHandler) {
      return badRequest(`Unknown RPC function: ${funcName}`, origin);
    }

    const body = parseBody<Record<string, unknown>>(event.body);

    const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
      return rpcHandler(client, body);
    });

    return success(data, origin);
  } catch (err) {
    console.error('RPC handler error:', err);
    return error(
      err instanceof Error ? err.message : 'Internal server error',
      500,
      origin
    );
  }
};
