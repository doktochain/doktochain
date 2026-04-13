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
       SELECT 'lab_result' as event_type, id, record_date as event_date,
              title as description, status
       FROM medical_records WHERE patient_id = $1 AND record_type = 'lab_result'
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
       WHERE patient_id = $1 AND record_type = 'lab_result'
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
  const body = parseBody<{
    patient_id: string;
    record_type: string;
    title: string;
    description?: string;
    record_date: string;
    data?: Record<string, unknown>;
  }>(event.body);

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const result = await client.query(
      `INSERT INTO medical_records
       (patient_id, record_type, title, description, record_date, data, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [body.patient_id, body.record_type, body.title, body.description,
       body.record_date, JSON.stringify(body.data || {}), user.userId]
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

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return router.handle(event);
};
