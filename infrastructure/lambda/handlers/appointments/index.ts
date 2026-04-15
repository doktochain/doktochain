import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Router } from '../../shared/router';
import { requireAuth } from '../../shared/auth';
import { withRLS } from '../../shared/db';
import {
  success, created, noContent, badRequest, notFound, ClientError,
  parseBody, getOrigin, getQueryParam,
} from '../../shared/response';

const router = new Router('/appointments');

router.get('/', async (event) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);

  const status = getQueryParam(event.queryStringParameters, 'status');
  const role = getQueryParam(event.queryStringParameters, 'role') || user.role;
  const limit = parseInt(getQueryParam(event.queryStringParameters, 'limit') || '50', 10);
  const offset = parseInt(getQueryParam(event.queryStringParameters, 'offset') || '0', 10);

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    let query = `
      SELECT a.*,
        json_build_object(
          'id', prov.id, 'first_name', pup.first_name, 'last_name', pup.last_name,
          'profile_photo_url', pup.profile_photo_url
        ) as provider,
        json_build_object(
          'id', pat.id, 'first_name', patup.first_name, 'last_name', patup.last_name
        ) as patient,
        json_build_object(
          'id', pl.id, 'name', pl.name, 'city', pl.city
        ) as location
      FROM appointments a
      LEFT JOIN providers prov ON a.provider_id = prov.id
      LEFT JOIN user_profiles pup ON prov.user_id = pup.id
      LEFT JOIN patients pat ON a.patient_id = pat.id
      LEFT JOIN user_profiles patup ON pat.user_id = patup.id
      LEFT JOIN provider_locations pl ON a.location_id = pl.id
      WHERE 1=1
    `;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (role === 'patient') {
      query += ` AND a.patient_id = (SELECT id FROM patients WHERE user_id = $${paramIndex})`;
      params.push(user.userId);
      paramIndex++;
    } else if (role === 'provider') {
      query += ` AND a.provider_id = (SELECT id FROM providers WHERE user_id = $${paramIndex})`;
      params.push(user.userId);
      paramIndex++;
    }

    if (status) {
      query += ` AND a.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY a.appointment_date DESC, a.start_time DESC`;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await client.query(query, params);
    return result.rows;
  });

  return success(data, origin);
});

router.get('/:id', async (event, params) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const result = await client.query(
      `SELECT a.*,
        json_build_object(
          'id', prov.id, 'first_name', pup.first_name, 'last_name', pup.last_name,
          'profile_photo_url', pup.profile_photo_url
        ) as provider,
        json_build_object(
          'id', pat.id, 'first_name', patup.first_name, 'last_name', patup.last_name,
          'phone', patup.phone, 'email', patup.email
        ) as patient,
        json_build_object(
          'id', pl.id, 'name', pl.name, 'address_line1', pl.address_line1,
          'city', pl.city, 'province', pl.province
        ) as location
       FROM appointments a
       LEFT JOIN providers prov ON a.provider_id = prov.id
       LEFT JOIN user_profiles pup ON prov.user_id = pup.id
       LEFT JOIN patients pat ON a.patient_id = pat.id
       LEFT JOIN user_profiles patup ON pat.user_id = patup.id
       LEFT JOIN provider_locations pl ON a.location_id = pl.id
       WHERE a.id = $1`,
      [params.id]
    );
    return result.rows[0] || null;
  });

  if (!data) return notFound('Appointment not found', origin);
  return success(data, origin);
});

router.post('/', async (event) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);
  const body = parseBody<{
    provider_id: string;
    patient_id?: string;
    location_id?: string;
    appointment_date: string;
    start_time: string;
    end_time: string;
    consultation_type: string;
    reason_for_visit?: string;
    notes?: string;
  }>(event.body);

  if (!body.provider_id || !body.appointment_date || !body.start_time || !body.end_time) {
    return badRequest('Provider, date, start time, and end time are required', origin);
  }

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    let patientId = body.patient_id;

    if (!patientId) {
      const patientResult = await client.query(
        `SELECT id FROM patients WHERE user_id = $1`, [user.userId]
      );
      patientId = patientResult.rows[0]?.id;
    }

    if (!patientId) return null;

    const conflictCheck = await client.query(
      `SELECT id FROM appointments
       WHERE provider_id = $1 AND appointment_date = $2
       AND status NOT IN ('cancelled', 'no-show')
       AND (start_time, end_time) OVERLAPS ($3::time, $4::time)`,
      [body.provider_id, body.appointment_date, body.start_time, body.end_time]
    );

    if (conflictCheck.rows.length > 0) {
      throw new ClientError('Time slot is already booked', 409);
    }

    const result = await client.query(
      `INSERT INTO appointments
       (patient_id, provider_id, location_id, appointment_date, start_time, end_time,
        consultation_type, reason_for_visit, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'scheduled')
       RETURNING *`,
      [patientId, body.provider_id, body.location_id, body.appointment_date,
       body.start_time, body.end_time, body.consultation_type,
       body.reason_for_visit, body.notes]
    );

    const appointment = result.rows[0];

    const providerResult = await client.query(
      `SELECT user_id FROM providers WHERE id = $1`, [body.provider_id]
    );

    if (providerResult.rows[0]) {
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type, is_read)
         VALUES ($1, 'New Appointment', 'A new appointment has been booked.', 'appointment', false)`,
        [providerResult.rows[0].user_id]
      );
    }

    return appointment;
  });

  if (!data) return badRequest('Patient profile not found', origin);
  return created(data, origin);
});

router.put('/:id', async (event, params) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);
  const body = parseBody<Record<string, unknown>>(event.body);

  const allowedFields = [
    'status', 'appointment_date', 'start_time', 'end_time',
    'reason_for_visit', 'notes', 'cancellation_reason', 'payment_status',
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
  values.push(params.id);

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const result = await client.query(
      `UPDATE appointments SET ${updates.join(', ')}, updated_at = now()
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );
    return result.rows[0];
  });

  if (!data) return notFound('Appointment not found', origin);
  return success(data, origin);
});

router.post('/:id/cancel', async (event, params) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);
  const body = parseBody<{ reason?: string }>(event.body);

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const result = await client.query(
      `UPDATE appointments
       SET status = 'cancelled', cancellation_reason = $1, updated_at = now()
       WHERE id = $2 AND status IN ('scheduled', 'confirmed')
       RETURNING *`,
      [body.reason || 'Cancelled by user', params.id]
    );
    return result.rows[0];
  });

  if (!data) return badRequest('Appointment cannot be cancelled', origin);
  return success(data, origin);
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return router.handle(event);
};
