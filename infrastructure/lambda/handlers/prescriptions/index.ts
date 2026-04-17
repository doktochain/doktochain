import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Router } from '../../shared/router';
import { requireAuth, requireRole } from '../../shared/auth';
import { withRLS } from '../../shared/db';
import {
  success, created, badRequest, notFound, ClientError,
  parseBody, getOrigin, getQueryParam,
} from '../../shared/response';

const router = new Router('/prescriptions');

router.get('/', async (event) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);
  const status = getQueryParam(event.queryStringParameters, 'status');
  const role = user.role;

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    let query = `
      SELECT rx.*,
        json_build_object('id', prov.id, 'first_name', pup.first_name, 'last_name', pup.last_name) as provider,
        json_build_object('id', pat.id, 'first_name', patup.first_name, 'last_name', patup.last_name) as patient,
        json_build_object('id', ph.id, 'name', ph.pharmacy_name) as pharmacy,
        COALESCE(json_agg(ri.*) FILTER (WHERE ri.id IS NOT NULL), '[]') as items
      FROM prescriptions rx
      LEFT JOIN providers prov ON rx.provider_id = prov.id
      LEFT JOIN user_profiles pup ON prov.user_id = pup.id
      LEFT JOIN patients pat ON rx.patient_id = pat.id
      LEFT JOIN user_profiles patup ON pat.user_id = patup.id
      LEFT JOIN pharmacies ph ON rx.pharmacy_id = ph.id
      LEFT JOIN prescription_items ri ON rx.id = ri.prescription_id
      WHERE 1=1
    `;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (role === 'patient') {
      query += ` AND rx.patient_id = (SELECT id FROM patients WHERE user_id = $${paramIndex})`;
      params.push(user.userId);
      paramIndex++;
    } else if (role === 'provider') {
      query += ` AND rx.provider_id = (SELECT id FROM providers WHERE user_id = $${paramIndex})`;
      params.push(user.userId);
      paramIndex++;
    } else if (role === 'pharmacy') {
      query += ` AND rx.pharmacy_id = (SELECT id FROM pharmacies WHERE user_id = $${paramIndex})`;
      params.push(user.userId);
      paramIndex++;
    }

    if (status) {
      query += ` AND rx.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` GROUP BY rx.id, prov.id, pup.id, pat.id, patup.id, ph.id`;
    query += ` ORDER BY rx.prescription_date DESC LIMIT 100`;

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
      `SELECT rx.*,
        json_build_object('id', prov.id, 'first_name', pup.first_name, 'last_name', pup.last_name) as provider,
        json_build_object('id', pat.id, 'first_name', patup.first_name, 'last_name', patup.last_name) as patient,
        json_build_object('id', ph.id, 'name', ph.pharmacy_name, 'phone', ph.phone) as pharmacy,
        COALESCE(json_agg(ri.*) FILTER (WHERE ri.id IS NOT NULL), '[]') as items
       FROM prescriptions rx
       LEFT JOIN providers prov ON rx.provider_id = prov.id
       LEFT JOIN user_profiles pup ON prov.user_id = pup.id
       LEFT JOIN patients pat ON rx.patient_id = pat.id
       LEFT JOIN user_profiles patup ON pat.user_id = patup.id
       LEFT JOIN pharmacies ph ON rx.pharmacy_id = ph.id
       LEFT JOIN prescription_items ri ON rx.id = ri.prescription_id
       WHERE rx.id = $1
       GROUP BY rx.id, prov.id, pup.id, pat.id, patup.id, ph.id`,
      [params.id]
    );
    return result.rows[0] || null;
  });

  if (!data) return notFound('Prescription not found', origin);
  return success(data, origin);
});

router.post('/', async (event) => {
  const origin = getOrigin(event.headers);
  const user = requireRole(event, 'provider', 'admin');
  const body = parseBody<{
    patient_id: string;
    pharmacy_id?: string;
    appointment_id?: string;
    diagnosis?: string;
    notes?: string;
    items: Array<{
      medication_name: string;
      strength: string;
      dosage_form?: string;
      frequency: string;
      duration_days?: number;
      quantity?: number;
      refills_allowed?: number;
      dosage_instructions?: string;
    }>;
  }>(event.body);

  if (!body.patient_id || !body.items?.length) {
    return badRequest('Patient ID and at least one medication item are required', origin);
  }

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const providerResult = await client.query(
      `SELECT id FROM providers WHERE user_id = $1`, [user.userId]
    );
    const providerId = providerResult.rows[0]?.id;
    if (!providerId) throw new ClientError('Provider profile not found');

    const rxNumber = `RX-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const rxResult = await client.query(
      `INSERT INTO prescriptions
       (prescription_number, provider_id, patient_id, pharmacy_id, appointment_id, diagnosis, notes, status, prescription_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', CURRENT_DATE)
       RETURNING *`,
      [rxNumber, providerId, body.patient_id, body.pharmacy_id, body.appointment_id, body.diagnosis, body.notes]
    );
    const prescription = rxResult.rows[0];

    for (const item of body.items) {
      await client.query(
        `INSERT INTO prescription_items
         (prescription_id, medication_name, strength, dosage_form, frequency, duration_days, quantity, refills_allowed, dosage_instructions)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [prescription.id, item.medication_name, item.strength || 'as prescribed',
         item.dosage_form || 'tablet', item.frequency,
         item.duration_days, item.quantity || 1, item.refills_allowed || 0,
         item.dosage_instructions || `Take ${item.strength || ''} ${item.frequency}`]
      );
    }

    return prescription;
  });

  return created(data, origin);
});

router.put('/:id/status', async (event, params) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);
  const body = parseBody<{ status: string; notes?: string }>(event.body);

  const validStatuses = ['pending', 'sent', 'filled', 'cancelled'];
  if (!validStatuses.includes(body.status)) {
    return badRequest('Invalid status', origin);
  }

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const result = await client.query(
      `UPDATE prescriptions SET status = $1, notes = COALESCE($2, notes), updated_at = now()
       WHERE id = $3
       RETURNING *`,
      [body.status, body.notes, params.id]
    );
    return result.rows[0];
  });

  if (!data) return notFound('Prescription not found', origin);
  return success(data, origin);
});

router.put('/:id', async (event, params) => {
  const origin = getOrigin(event.headers);
  const user = requireRole(event, 'provider', 'admin');
  const body = parseBody<Record<string, unknown>>(event.body);

  const allowedFields = [
    'diagnosis', 'notes', 'pharmacy_id', 'appointment_id', 'is_controlled_substance',
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

  if (updates.length === 0) {
    return badRequest('No valid fields to update', origin);
  }

  values.push(params.id);

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const result = await client.query(
      `UPDATE prescriptions SET ${updates.join(', ')}, updated_at = now()
       WHERE id = $${paramIndex} AND status = 'pending'
       RETURNING *`,
      values
    );
    return result.rows[0];
  });

  if (!data) return badRequest('Prescription not found or no longer editable', origin);
  return success(data, origin);
});

router.put('/:id/redirect', async (event, params) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);
  const body = parseBody<{ pharmacy_id: string }>(event.body);

  if (!body.pharmacy_id) return badRequest('Pharmacy ID is required', origin);

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const result = await client.query(
      `UPDATE prescriptions SET pharmacy_id = $1, status = 'pending', updated_at = now()
       WHERE id = $2
       RETURNING *`,
      [body.pharmacy_id, params.id]
    );
    return result.rows[0];
  });

  if (!data) return notFound('Prescription not found', origin);
  return success(data, origin);
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return router.handle(event);
};
