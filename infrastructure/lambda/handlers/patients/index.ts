import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Router } from '../../shared/router';
import { requireAuth, requireRole } from '../../shared/auth';
import { withRLS } from '../../shared/db';
import {
  success, created, noContent, badRequest, notFound,
  parseBody, getOrigin, getQueryParam,
} from '../../shared/response';

const router = new Router('/patients');

router.get('/profile/:id', async (event) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const result = await client.query(
      `SELECT p.*, up.email, up.first_name, up.last_name, up.phone,
              up.date_of_birth, up.gender, up.profile_photo_url,
              up.address_line1, up.address_line2, up.city, up.province,
              up.postal_code, up.country, up.language_preference
       FROM patients p
       JOIN user_profiles up ON p.user_id = up.id
       WHERE p.user_id = $1`,
      [user.userId]
    );
    return result.rows[0] || null;
  });

  if (!data) return notFound('Patient profile not found', origin);
  return success(data, origin);
});

router.get('/profile/:id', async (event, params) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const result = await client.query(
      `SELECT p.*, up.email, up.first_name, up.last_name, up.phone,
              up.date_of_birth, up.gender, up.profile_photo_url,
              up.city, up.province
       FROM patients p
       JOIN user_profiles up ON p.user_id = up.id
       WHERE p.id = $1`,
      [params.id]
    );
    return result.rows[0] || null;
  });

  if (!data) return notFound('Patient not found', origin);
  return success(data, origin);
});

router.put('/profile/:id', async (event, params) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);
  const body = parseBody<Record<string, unknown>>(event.body);

  const allowedFields = [
    'health_card_number', 'health_card_province', 'health_card_expiry',
    'blood_type', 'height_cm', 'weight_kg', 'medical_history', 'chronic_conditions',
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
      `UPDATE patients SET ${updates.join(', ')}, updated_at = now()
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );
    return result.rows[0];
  });

  return success(data, origin);
});

router.get('/', async (event) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);
  
  const result = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const r = await client.query(
      `SELECT p.*, up.first_name, up.last_name, up.email, up.phone,
              up.date_of_birth, up.gender, up.profile_photo_url,
              up.address_line1, up.city, up.province, up.postal_code
       FROM patients p
       JOIN user_profiles up ON p.user_id = up.id
       WHERE p.user_id = $1 LIMIT 1`,
      [user.userId]
    );
    return r.rows[0] || null;
  });
  
  return success(result, origin);
});

router.post('/', async (event) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);
  const body = parseBody<any>(event.body);
  
  const result = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const r = await client.query(
      `INSERT INTO patients (user_id, ${Object.keys(body).join(', ')})
       VALUES ($1, ${Object.keys(body).map((_, i) => `$${i + 2}`).join(', ')})
       ON CONFLICT (user_id) DO UPDATE SET ${Object.keys(body).map((k, i) => `${k} = $${i + 2}`).join(', ')}
       RETURNING *`,
      [user.userId, ...Object.values(body)]
    );
    return r.rows[0];
  });
  
  return success(result, origin);
});

router.get('/:id/allergies', async (event, params) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const result = await client.query(
      `SELECT * FROM patient_allergies WHERE patient_id = $1 ORDER BY created_at DESC`,
      [params.id]
    );
    return result.rows;
  });

  return success(data, origin);
});

router.post('/:id/allergies', async (event, params) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);
  const body = parseBody<{
    allergen: string;
    reaction?: string;
    severity?: string;
    diagnosed_date?: string;
    notes?: string;
  }>(event.body);

  if (!body.allergen) return badRequest('Allergen is required', origin);

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const result = await client.query(
      `INSERT INTO patient_allergies (patient_id, allergen, reaction, severity, diagnosed_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [params.id, body.allergen, body.reaction, body.severity, body.diagnosed_date, body.notes]
    );
    return result.rows[0];
  });

  return created(data, origin);
});

router.delete('/:id/allergies/:allergyId', async (event, params) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);

  await withRLS(user.userId, user.role, user.claims, async (client) => {
    await client.query(
      `DELETE FROM patient_allergies WHERE id = $1 AND patient_id = $2`,
      [params.allergyId, params.id]
    );
  });

  return noContent(origin);
});

router.get('/:id/medications', async (event, params) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);
  const activeOnly = getQueryParam(event.queryStringParameters, 'active');

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    let query = `SELECT * FROM patient_medications WHERE patient_id = $1`;
    const queryParams: unknown[] = [params.id];

    if (activeOnly === 'true') {
      query += ` AND is_active = true`;
    }

    query += ` ORDER BY created_at DESC`;
    const result = await client.query(query, queryParams);
    return result.rows;
  });

  return success(data, origin);
});

router.post('/:id/medications', async (event, params) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);
  const body = parseBody<{
    medication_name: string;
    dosage: string;
    frequency: string;
    start_date: string;
    end_date?: string;
    prescribing_provider?: string;
    notes?: string;
  }>(event.body);

  if (!body.medication_name || !body.dosage || !body.frequency || !body.start_date) {
    return badRequest('Medication name, dosage, frequency, and start date are required', origin);
  }

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const result = await client.query(
      `INSERT INTO patient_medications
       (patient_id, medication_name, dosage, frequency, start_date, end_date, prescribing_provider, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [params.id, body.medication_name, body.dosage, body.frequency,
       body.start_date, body.end_date, body.prescribing_provider, body.notes]
    );
    return result.rows[0];
  });

  return created(data, origin);
});

router.get('/:id/emergency-contacts', async (event, params) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const result = await client.query(
      `SELECT * FROM emergency_contacts WHERE patient_id = $1 ORDER BY created_at DESC`,
      [params.id]
    );
    return result.rows;
  });

  return success(data, origin);
});

router.get('/:id/insurance-cards', async (event, params) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const result = await client.query(
      `SELECT * FROM patient_insurance_cards WHERE patient_id = $1 ORDER BY created_at DESC`,
      [params.id]
    );
    return result.rows;
  });

  return success(data, origin);
});

router.put('/:id', async (event, params) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);
  const body = parseBody<Record<string, unknown>>(event.body);

  const allowedFields = [
    'health_card_number', 'health_card_province', 'health_card_expiry',
    'blood_type', 'height_cm', 'weight_kg', 'medical_history',
    'chronic_conditions', 'first_name', 'last_name', 'phone',
    'date_of_birth', 'gender', 'address_line1', 'address_line2',
    'city', 'province', 'postal_code', 'country',
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
      `UPDATE patients SET ${updates.join(', ')}, updated_at = now()
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );
    return result.rows[0];
  });

  return success(data, origin);
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return router.handle(event);
};
