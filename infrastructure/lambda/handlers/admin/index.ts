import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Router } from '../../shared/router';
import { requireRole } from '../../shared/auth';
import { withRLS } from '../../shared/db';
import {
  success, badRequest, notFound,
  parseBody, getOrigin, getQueryParam,
} from '../../shared/response';

const router = new Router('/admin');

router.get('/stats', async (event) => {
  const origin = getOrigin(event.headers);
  const user = requireRole(event, 'admin');

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const today = new Date().toISOString().split('T')[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      users, providers, verifiedProviders, patients, pharmacies,
      pendingProviders, pendingPharmacies, todayAppointments, completedAppt,
      newRegistrations, recentProviders, recentPatients, recentAppointments,
      pendingPrescriptions, appointmentStatuses
    ] = await Promise.all([
      client.query(`SELECT count(*) FROM user_profiles`),
      client.query(`SELECT count(*) FROM providers WHERE is_active = true`),
      client.query(`SELECT count(*) FROM providers WHERE is_verified = true`),
      client.query(`SELECT count(*) FROM patients`),
      client.query(`SELECT count(*) FROM pharmacies WHERE is_active = true`),
      client.query(`SELECT count(*) FROM providers WHERE is_verified = false AND is_active = false`),
      client.query(`SELECT count(*) FROM pharmacies WHERE is_verified = false`),
      client.query(`SELECT count(*) FROM appointments WHERE appointment_date = $1 AND status IN ('scheduled','confirmed','in-progress')`, [today]),
      client.query(`SELECT count(*) FROM appointments WHERE appointment_date >= $1 AND status = 'completed'`, [monthStart.split('T')[0]]),
      client.query(`SELECT count(*) FROM user_profiles WHERE created_at >= $1`, [weekAgo]),
      client.query(`SELECT p.id, p.user_id, p.created_at, up.first_name, up.last_name FROM providers p JOIN user_profiles up ON p.user_id = up.id ORDER BY p.created_at DESC LIMIT 4`),
      client.query(`SELECT id, first_name, last_name, created_at, role FROM user_profiles WHERE role = 'patient' ORDER BY created_at DESC LIMIT 4`),
      client.query(`SELECT id, appointment_date, status, created_at FROM appointments ORDER BY created_at DESC LIMIT 4`),
      client.query(`SELECT count(*) FROM prescriptions WHERE status = 'pending'`),
      client.query(`SELECT status, count(*) FROM appointments WHERE created_at >= $1 GROUP BY status`, [monthStart]),
    ]);

    const appointmentStatusMap: Record<string, number> = {};
    appointmentStatuses.rows.forEach((r: any) => {
      appointmentStatusMap[r.status] = parseInt(r.count);
    });

    return {
      totalUsers: parseInt(users.rows[0].count),
      activeProviders: parseInt(providers.rows[0].count),
      verifiedProviders: parseInt(verifiedProviders.rows[0].count),
      totalPatients: parseInt(patients.rows[0].count),
      activePharmacies: parseInt(pharmacies.rows[0].count),
      totalClinics: 0,
      pendingProviders: parseInt(pendingProviders.rows[0].count),
      pendingPharmacies: parseInt(pendingPharmacies.rows[0].count),
      todayAppointments: parseInt(todayAppointments.rows[0].count),
      appointmentsThisMonth: parseInt(completedAppt.rows[0].count),
      newRegistrationsThisWeek: parseInt(newRegistrations.rows[0].count),
      recentProviders: recentProviders.rows,
      recentPatients: recentPatients.rows,
      recentAppointments: recentAppointments.rows,
      pendingPrescriptions: parseInt(pendingPrescriptions.rows[0].count),
      appointmentStatuses: appointmentStatusMap,
      prescriptionsThisMonth: 0,
      totalRevenue: 0,
      stats: {
        alerts: [
          ...(parseInt(pendingProviders.rows[0].count) > 0 ? [{ title: 'Pending Provider Applications', count: parseInt(pendingProviders.rows[0].count), priority: 'high', link: '/dashboard/admin/provider-applications' }] : []),
          ...(parseInt(pendingPharmacies.rows[0].count) > 0 ? [{ title: 'Pending Pharmacy Applications', count: parseInt(pendingPharmacies.rows[0].count), priority: 'high', link: '/dashboard/admin/pharmacies' }] : []),
        ]
      }
    };
  });

  return success(data, origin);
});

router.get('/users', async (event) => {
  const origin = getOrigin(event.headers);
  const user = requireRole(event, 'admin');
  const role = getQueryParam(event.queryStringParameters, 'role');
  const search = getQueryParam(event.queryStringParameters, 'search');
  const limit = parseInt(getQueryParam(event.queryStringParameters, 'limit') || '50', 10);
  const offset = parseInt(getQueryParam(event.queryStringParameters, 'offset') || '0', 10);

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    let query = `SELECT * FROM user_profiles WHERE 1=1`;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (role) {
      query += ` AND role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }

    if (search) {
      query += ` AND (first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await client.query(query, params);
    return result.rows;
  });

  return success(data, origin);
});

router.get('/providers', async (event) => {
  const origin = getOrigin(event.headers);
  const user = requireRole(event, 'admin');
  const status = getQueryParam(event.queryStringParameters, 'status');

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    let query = `
      SELECT p.*, up.first_name, up.last_name, up.email, up.phone
      FROM providers p
      JOIN user_profiles up ON p.user_id = up.id
      WHERE 1=1
    `;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (status === 'pending') {
      query += ` AND p.is_verified = false`;
    } else if (status === 'verified') {
      query += ` AND p.is_verified = true`;
    }

    query += ` ORDER BY p.created_at DESC LIMIT 100`;
    const result = await client.query(query, params);
    return result.rows;
  });

  return success(data, origin);
});

router.put('/providers/:id/verify', async (event, params) => {
  const origin = getOrigin(event.headers);
  const user = requireRole(event, 'admin');

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const result = await client.query(
      `UPDATE providers SET is_verified = true, is_active = true, verification_date = now(), updated_at = now()
       WHERE id = $1 RETURNING *`,
      [params.id]
    );

    if (result.rows[0]) {
      await client.query(
        `INSERT INTO notifications (user_id, title, message, notification_type, is_read)
         VALUES ($1, 'Account Verified', 'Your provider account has been verified.', 'system', false)`,
        [result.rows[0].user_id]
      );
    }

    return result.rows[0];
  });

  if (!data) return notFound('Provider not found', origin);
  return success(data, origin);
});

router.get('/pharmacies', async (event) => {
  const origin = getOrigin(event.headers);
  const user = requireRole(event, 'admin');

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const result = await client.query(
      `SELECT ph.*, up.first_name as owner_first_name, up.last_name as owner_last_name, up.email as owner_email
       FROM pharmacies ph
       LEFT JOIN user_profiles up ON ph.user_id = up.id
       ORDER BY ph.created_at DESC LIMIT 100`
    );
    return result.rows;
  });

  return success(data, origin);
});

router.get('/appointments', async (event) => {
  const origin = getOrigin(event.headers);
  const user = requireRole(event, 'admin');
  const status = getQueryParam(event.queryStringParameters, 'status');

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    let query = `
      SELECT a.*, pup.first_name as provider_first_name, pup.last_name as provider_last_name,
             patup.first_name as patient_first_name, patup.last_name as patient_last_name
      FROM appointments a
      LEFT JOIN providers prov ON a.provider_id = prov.id
      LEFT JOIN user_profiles pup ON prov.user_id = pup.id
      LEFT JOIN patients pat ON a.patient_id = pat.id
      LEFT JOIN user_profiles patup ON pat.user_id = patup.id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (status) {
      query += ` AND a.status = $1`;
      params.push(status);
    }

    query += ` ORDER BY a.appointment_date DESC LIMIT 100`;
    const result = await client.query(query, params);
    return result.rows;
  });

  return success(data, origin);
});

const ALLOWED_CRUD_TABLES = [
  'medical_services', 'procedures_master', 'products_master',
  'clinic_locations', 'medical_assets', 'insurance_providers',
  'specialties_master', 'admin_audit_log', 'insurance_providers_master', 'provider_availability'
];

router.get('/crud/:table', async (event, params) => {
  const origin = getOrigin(event.headers);
  const user = requireRole(event, 'admin');
  const table = params?.table || '';

  if (!ALLOWED_CRUD_TABLES.includes(table)) {
    return badRequest(`Table '${table}' is not allowed`, origin);
  }

  const includeDeleted = getQueryParam(event.queryStringParameters, 'include_deleted') === 'true';

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    // Check if table has deleted_at column
    const colCheck = await client.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = $1 AND column_name = 'deleted_at'`,
      [table]
    );
    const hasDeletedAt = colCheck.rows.length > 0;

    let query = `SELECT * FROM ${table}`;
    if (!includeDeleted && hasDeletedAt) query += ` WHERE deleted_at IS NULL`;
    query += ` ORDER BY created_at DESC`;
    const result = await client.query(query);
    return result.rows;
  });

  return success(data, origin);
});

router.get('/crud/:table/:id', async (event, params) => {
  const origin = getOrigin(event.headers);
  const user = requireRole(event, 'admin');
  const table = params?.table || '';
  const id = params?.id || '';

  if (!ALLOWED_CRUD_TABLES.includes(table)) {
    return badRequest(`Table '${table}' is not allowed`, origin);
  }

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const result = await client.query(
      `SELECT * FROM ${table} WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  });

  if (!data) return notFound('Record not found', origin);
  return success(data, origin);
});

router.post('/crud/:table', async (event, params) => {
  const origin = getOrigin(event.headers);
  const user = requireRole(event, 'admin');
  const table = params?.table || '';

  if (!ALLOWED_CRUD_TABLES.includes(table)) {
    return badRequest(`Table '${table}' is not allowed`, origin);
  }

  const body = parseBody<Record<string, unknown>>(event.body);
  const keys = Object.keys(body);
  const values = Object.values(body);
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  const columns = keys.join(', ');

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const result = await client.query(
      `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    return result.rows[0];
  });

  return success(data, origin);
});

router.put('/crud/:table/:id', async (event, params) => {
  const origin = getOrigin(event.headers);
  const user = requireRole(event, 'admin');
  const table = params?.table || '';
  const id = params?.id || '';

  if (!ALLOWED_CRUD_TABLES.includes(table)) {
    return badRequest(`Table '${table}' is not allowed`, origin);
  }

  const body = parseBody<Record<string, unknown>>(event.body);
  const keys = Object.keys(body);
  const values = Object.values(body);
  const updates = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  values.push(id);

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const result = await client.query(
      `UPDATE ${table} SET ${updates}, updated_at = now() WHERE id = $${values.length} RETURNING *`,
      values
    );
    return result.rows[0];
  });

  if (!data) return notFound('Record not found', origin);
  return success(data, origin);
});

router.delete('/crud/:table/:id', async (event, params) => {
  const origin = getOrigin(event.headers);
  const user = requireRole(event, 'admin');
  const table = params?.table || '';
  const id = params?.id || '';

  if (!ALLOWED_CRUD_TABLES.includes(table)) {
    return badRequest(`Table '${table}' is not allowed`, origin);
  }

  await withRLS(user.userId, user.role, user.claims, async (client) => {
    await client.query(
      `UPDATE ${table} SET deleted_at = now() WHERE id = $1`,
      [id]
    );
  });

  return success({ message: 'Deleted successfully' }, origin);
});

router.delete('/users/:id', async (event, params) => {
  const origin = getOrigin(event.headers);
  const user = requireRole(event, 'admin');

  await withRLS(user.userId, user.role, user.claims, async (client) => {
    await client.query(`DELETE FROM user_profiles WHERE id = $1`, [params.id]);
  });

  return success({ message: 'User deleted' }, origin);
});

const ADMIN_USER_FIELDS = [
  'first_name', 'last_name', 'phone', 'email', 'role',
  'date_of_birth', 'gender', 'address_line1', 'address_line2',
  'city', 'province', 'postal_code', 'country',
  'language_preference', 'profile_completed', 'is_active',
];

router.put('/users/:id', async (event, params) => {
  const origin = getOrigin(event.headers);
  const user = requireRole(event, 'admin');
  const body = parseBody<Record<string, unknown>>(event.body);

  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  for (const field of ADMIN_USER_FIELDS) {
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
      `UPDATE user_profiles SET ${updates.join(', ')}, updated_at = now() WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0];
  });

  if (!data) return notFound('User not found', origin);
  return success(data, origin);
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return router.handle(event);
};
