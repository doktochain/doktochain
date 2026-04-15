import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Router } from '../../shared/router';
import { requireAuth } from '../../shared/auth';
import { withRLS } from '../../shared/db';
import {
  success, created, notFound,
  parseBody, getOrigin, getQueryParam,
} from '../../shared/response';

const router = new Router('/health-records');

router.get('/patient/:patientId', async (event, params) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);
  const category = getQueryParam(event.queryStringParameters, 'category');

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    let query = `SELECT * FROM medical_records WHERE patient_id = $1`;
    const queryParams: unknown[] = [params.patientId];
    let paramIndex = 2;

    if (category) {
      query += ` AND record_type = $${paramIndex}`;
      queryParams.push(category);
      paramIndex++;
    }

    query += ` ORDER BY record_date DESC LIMIT 100`;
    const result = await client.query(query, queryParams);
    return result.rows;
  });

  return success(data, origin);
});

router.get('/patient/:patientId/timeline', async (event, params) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const result = await client.query(
      `SELECT 'appointment' as event_type, id, appointment_date as event_date,
              reason_for_visit as description, status
       FROM appointments WHERE patient_id = $1
       UNION ALL
       SELECT 'prescription' as event_type, id, prescription_date as event_date,
              diagnosis as description, status
       FROM prescriptions WHERE patient_id = $1
       UNION ALL
       SELECT 'lab-result' as event_type, id, record_date as event_date,
              title as description, 'complete' as status
       FROM medical_records WHERE patient_id = $1 AND record_type = 'lab-result'
       ORDER BY event_date DESC LIMIT 100`,
      [params.patientId]
    );
    return result.rows;
  });

  return success(data, origin);
});

router.get('/patient/:patientId/immunizations', async (event, params) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const result = await client.query(
      `SELECT * FROM medical_records
       WHERE patient_id = $1 AND record_type = 'immunization'
       ORDER BY record_date DESC`,
      [params.patientId]
    );
    return result.rows;
  });

  return success(data, origin);
});

router.get('/patient/:patientId/lab-results', async (event, params) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const result = await client.query(
      `SELECT * FROM medical_records
       WHERE patient_id = $1 AND record_type = 'lab-result'
       ORDER BY record_date DESC LIMIT 50`,
      [params.patientId]
    );
    return result.rows;
  });

  return success(data, origin);
});

router.post('/', async (event) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);
  const body = parseBody<any>(event.body);

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const providerResult = await client.query(
      `SELECT id FROM providers WHERE user_id = $1`, [user.userId]
    );
    const providerId = providerResult.rows[0]?.id || null;

    const result = await client.query(
      `INSERT INTO medical_records
       (patient_id, provider_id, record_type, title, description, record_date, file_url, file_type, file_size_bytes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [body.patient_id, providerId, body.record_type, body.title, body.description,
       body.record_date, body.file_url || null, body.file_type || null, body.file_size_bytes || null]
    );
    return result.rows[0];
  });

  return created(data, origin);
});
router.get('/fhir/:patientId', async (event, params) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);
  const resourceType = getQueryParam(event.queryStringParameters, 'resource_type');

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    let query = `SELECT * FROM fhir_resources WHERE patient_id = $1`;
    const queryParams: unknown[] = [params.patientId];

    if (resourceType) {
      query += ` AND resource_type = $2`;
      queryParams.push(resourceType);
    }

    query += ` ORDER BY created_at DESC LIMIT 100`;
    const result = await client.query(query, queryParams);
    return result.rows;
  });

  return success(data, origin);
});

router.get('/:id', async (event, params) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const result = await client.query(
      `SELECT * FROM medical_records WHERE id = $1`,
      [params.id]
    );
    return result.rows[0] || null;
  });

  if (!data) return notFound('Record not found', origin);
  return success(data, origin);
});

router.put('/:id', async (event, params) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);
  const body = parseBody<Record<string, unknown>>(event.body);

  const allowedFields = ['title', 'description', 'record_date', 'record_type', 'file_url', 'file_type', 'file_size_bytes', 'category'];
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

  if (updates.length === 0) return success({}, origin);

  values.push(params.id);

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const result = await client.query(
      `UPDATE medical_records SET ${updates.join(', ')}
       WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0];
  });

  return success(data, origin);
});

router.delete('/:id', async (event, params) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);

  await withRLS(user.userId, user.role, user.claims, async (client) => {
    await client.query(`DELETE FROM medical_records WHERE id = $1`, [params.id]);
  });

  return success({ deleted: true }, origin);
});

router.post('/:id/share', async (event, params) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);
  const body = parseBody<{
    provider_id?: string;
    shared_with_email: string;
    record_types?: string[];
    share_end_date?: string;
  }>(event.body);

  if (!body.shared_with_email) {
    return (await import('../../shared/response')).badRequest('shared_with_email is required', origin);
  }

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const result = await client.query(
      `INSERT INTO record_shares (patient_id, shared_with_provider_id, shared_with_email, record_types, share_end_date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [user.userId, body.provider_id || null, body.shared_with_email,
       body.record_types || ['document'], body.share_end_date || null]
    );
    return result.rows[0];
  });

  return created(data, origin);
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return router.handle(event);
};
