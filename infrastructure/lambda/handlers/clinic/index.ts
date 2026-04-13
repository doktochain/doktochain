import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Router } from '../../shared/router';
import { requireAuth, requireRole } from '../../shared/auth';
import { withRLS } from '../../shared/db';
import {
  success, created, badRequest, notFound,
  parseBody, getOrigin, getQueryParam,
} from '../../shared/response';

const router = new Router('/clinic');

router.get('/', async (event) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const result = await client.query(
      `SELECT * FROM clinics WHERE is_active = true ORDER BY name LIMIT 100`
    );
    return result.rows;
  });

  return success(data, origin);
});

router.get('/me', async (event) => {
  const origin = getOrigin(event.headers);
  const user = requireRole(event, 'clinic', 'admin');

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const result = await client.query(
      `SELECT c.* FROM clinics c
       JOIN clinic_staff cs ON c.id = cs.clinic_id
       WHERE cs.user_id = $1 AND cs.role = 'owner'`,
      [user.userId]
    );
    return result.rows[0] || null;
  });

  if (!data) return notFound('Clinic not found', origin);
  return success(data, origin);
});

router.get('/:id', async (event, params) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const result = await client.query(
      `SELECT * FROM clinics WHERE id = $1`, [params.id]
    );
    return result.rows[0] || null;
  });

  if (!data) return notFound('Clinic not found', origin);
  return success(data, origin);
});

router.get('/:id/providers', async (event, params) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const result = await client.query(
      `SELECT p.*, up.first_name, up.last_name, up.profile_photo_url, pca.status as affiliation_status
       FROM provider_clinic_affiliations pca
       JOIN providers p ON pca.provider_id = p.id
       JOIN user_profiles up ON p.user_id = up.id
       WHERE pca.clinic_id = $1 AND pca.status = 'active'
       ORDER BY up.last_name`,
      [params.id]
    );
    return result.rows;
  });

  return success(data, origin);
});

router.get('/:id/appointments', async (event, params) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);
  const status = getQueryParam(event.queryStringParameters, 'status');
  const date = getQueryParam(event.queryStringParameters, 'date');

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    let query = `
      SELECT a.*, pup.first_name as provider_first_name, pup.last_name as provider_last_name,
             patup.first_name as patient_first_name, patup.last_name as patient_last_name
      FROM appointments a
      JOIN providers prov ON a.provider_id = prov.id
      JOIN provider_clinic_affiliations pca ON prov.id = pca.provider_id AND pca.clinic_id = $1
      LEFT JOIN user_profiles pup ON prov.user_id = pup.id
      LEFT JOIN patients pat ON a.patient_id = pat.id
      LEFT JOIN user_profiles patup ON pat.user_id = patup.id
      WHERE pca.status = 'active'
    `;
    const params_arr: unknown[] = [params.id];
    let paramIndex = 2;

    if (status) {
      query += ` AND a.status = $${paramIndex}`;
      params_arr.push(status);
      paramIndex++;
    }
    if (date) {
      query += ` AND a.appointment_date = $${paramIndex}`;
      params_arr.push(date);
      paramIndex++;
    }

    query += ` ORDER BY a.appointment_date DESC, a.start_time DESC LIMIT 100`;
    const result = await client.query(query, params_arr);
    return result.rows;
  });

  return success(data, origin);
});

router.post('/:id/invite-provider', async (event, params) => {
  const origin = getOrigin(event.headers);
  const user = requireRole(event, 'clinic', 'admin');
  const body = parseBody<{ provider_email: string; role?: string }>(event.body);

  if (!body.provider_email) return badRequest('Provider email is required', origin);

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const result = await client.query(
      `INSERT INTO clinic_provider_invitations (clinic_id, provider_email, invited_by, role, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
      [params.id, body.provider_email, user.userId, body.role || 'affiliated']
    );
    return result.rows[0];
  });

  return created(data, origin);
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return router.handle(event);
};
