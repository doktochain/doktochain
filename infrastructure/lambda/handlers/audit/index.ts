import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createHash } from 'crypto';
import { Router } from '../../shared/router';
import { requireAuth, requireRole } from '../../shared/auth';
import { withRLS } from '../../shared/db';
import {
  success, created,
  parseBody, getOrigin, getQueryParam,
} from '../../shared/response';

const router = new Router('/audit');

router.get('/trail', async (event) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);

  const resourceType = getQueryParam(event.queryStringParameters, 'resource_type');
  const resourceId = getQueryParam(event.queryStringParameters, 'resource_id');
  const eventType = getQueryParam(event.queryStringParameters, 'event_type');
  const startDate = getQueryParam(event.queryStringParameters, 'start_date');
  const endDate = getQueryParam(event.queryStringParameters, 'end_date');
  const limit = parseInt(getQueryParam(event.queryStringParameters, 'limit') || '100', 10);

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    let query = `SELECT * FROM blockchain_audit_log WHERE 1=1`;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (user.role !== 'admin') {
      query += ` AND actor_id = $${paramIndex}`;
      params.push(user.userId);
      paramIndex++;
    }

    if (resourceType) {
      query += ` AND resource_type = $${paramIndex}`;
      params.push(resourceType);
      paramIndex++;
    }
    if (resourceId) {
      query += ` AND resource_id = $${paramIndex}`;
      params.push(resourceId);
      paramIndex++;
    }
    if (eventType) {
      query += ` AND event_type = $${paramIndex}`;
      params.push(eventType);
      paramIndex++;
    }
    if (startDate) {
      query += ` AND timestamp >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }
    if (endDate) {
      query += ` AND timestamp <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += ` ORDER BY block_number DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await client.query(query, params);
    return result.rows;
  });

  return success(data, origin);
});

router.post('/log', async (event) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);
  const body = parseBody<{
    event_type: string;
    resource_type: string;
    resource_id: string;
    action_data: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }>(event.body);

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    await client.query(`SELECT pg_advisory_xact_lock(7283946190)`);

    const lastBlockResult = await client.query(
      `SELECT current_hash FROM blockchain_audit_log ORDER BY block_number DESC LIMIT 1`
    );
    const previousHash = lastBlockResult.rows[0]?.current_hash || '0';

    const timestamp = new Date().toISOString();
    const hashInput = JSON.stringify({
      previous_hash: previousHash,
      timestamp,
      event_type: body.event_type,
      resource_type: body.resource_type,
      resource_id: body.resource_id,
      action_data: body.action_data,
    });

    const currentHash = createHash('sha256').update(hashInput).digest('hex');

    const result = await client.query(
      `INSERT INTO blockchain_audit_log
       (previous_hash, current_hash, data_hash, action, timestamp, event_type,
        resource_type, resource_id, actor_id, actor_role, action_data, data_after, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [previousHash, currentHash, currentHash, body.event_type, timestamp,
       body.event_type, body.resource_type, body.resource_id, user.userId, user.role,
       JSON.stringify(body.action_data), JSON.stringify(body.action_data),
       JSON.stringify(body.metadata || {})]
    );

    return result.rows[0];
  });

  return created(data, origin);
});

router.get('/verify', async (event) => {
  const origin = getOrigin(event.headers);
  const user = requireRole(event, 'admin');

  const page = parseInt(getQueryParam(event.queryStringParameters, 'page') || '1', 10);
  const pageSize = parseInt(getQueryParam(event.queryStringParameters, 'page_size') || '1000', 10);
  const offset = (page - 1) * pageSize;

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const countResult = await client.query(
      `SELECT count(*)::int as total FROM blockchain_audit_log`
    );
    const total = countResult.rows[0].total;

    let prevHashResult = { rows: [] as { current_hash: string }[] };
    if (offset > 0) {
      prevHashResult = await client.query(
        `SELECT current_hash FROM blockchain_audit_log ORDER BY block_number ASC LIMIT 1 OFFSET $1`,
        [offset - 1]
      );
    }

    const result = await client.query(
      `SELECT block_number, previous_hash, current_hash FROM blockchain_audit_log ORDER BY block_number ASC LIMIT $1 OFFSET $2`,
      [pageSize, offset]
    );

    const blocks = result.rows;
    let valid = 0;
    let invalid = 0;
    const issues: Array<{ block_number: number; issue: string }> = [];

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      let expectedPrevHash: string | null = null;

      if (i === 0 && offset > 0 && prevHashResult.rows[0]) {
        expectedPrevHash = prevHashResult.rows[0].current_hash;
      } else if (i > 0) {
        expectedPrevHash = blocks[i - 1].current_hash;
      }

      if (expectedPrevHash && block.previous_hash !== expectedPrevHash) {
        invalid++;
        issues.push({
          block_number: block.block_number,
          issue: 'Hash chain broken',
        });
      } else {
        valid++;
      }
    }

    return {
      isValid: invalid === 0,
      totalBlocks: total,
      page,
      pageSize,
      validBlocks: valid,
      invalidBlocks: invalid,
      issues,
    };
  });

  return success(data, origin);
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return router.handle(event);
};
