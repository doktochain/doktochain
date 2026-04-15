import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Router } from '../../shared/router';
import { requireAuth, extractUser } from '../../shared/auth';
import { withRLS } from '../../shared/db';
import {
  success, created, badRequest, notFound,
  parseBody, getOrigin, getQueryParam,
} from '../../shared/response';

const router = new Router('/providers');

router.get('/', async (event) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);

  const specialty = getQueryParam(event.queryStringParameters, 'specialty');
  const city = getQueryParam(event.queryStringParameters, 'city');
  const province = getQueryParam(event.queryStringParameters, 'province');
  const acceptsNew = getQueryParam(event.queryStringParameters, 'accepts_new_patients');
  const search = getQueryParam(event.queryStringParameters, 'search');
  const limit = parseInt(getQueryParam(event.queryStringParameters, 'limit') || '20', 10);
  const offset = parseInt(getQueryParam(event.queryStringParameters, 'offset') || '0', 10);

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    let query = `
      SELECT p.*, up.first_name, up.last_name, up.profile_photo_url,
             up.city, up.province, up.language_preference,
             COALESCE(
               json_agg(DISTINCT ps.*) FILTER (WHERE ps.id IS NOT NULL), '[]'
             ) as specialties,
             COALESCE(
               json_agg(DISTINCT pl.*) FILTER (WHERE pl.id IS NOT NULL), '[]'
             ) as locations
      FROM providers p
      JOIN user_profiles up ON p.user_id = up.id
      LEFT JOIN provider_specialties ps ON p.id = ps.provider_id
      LEFT JOIN provider_locations pl ON p.id = pl.provider_id
      WHERE p.is_active = true AND p.is_verified = true
    `;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (specialty) {
      query += ` AND ps.specialty ILIKE $${paramIndex}`;
      params.push(`%${specialty}%`);
      paramIndex++;
    }

    if (city) {
      query += ` AND (up.city ILIKE $${paramIndex} OR pl.city ILIKE $${paramIndex})`;
      params.push(`%${city}%`);
      paramIndex++;
    }

    if (province) {
      query += ` AND (up.province = $${paramIndex} OR pl.province = $${paramIndex})`;
      params.push(province);
      paramIndex++;
    }

    if (acceptsNew === 'true') {
      query += ` AND p.accepts_new_patients = true`;
    }

    if (search) {
      query += ` AND (up.first_name ILIKE $${paramIndex} OR up.last_name ILIKE $${paramIndex} OR ps.specialty ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` GROUP BY p.id, up.id`;
    query += ` ORDER BY p.created_at DESC`;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await client.query(query, params);
    return result.rows;
  });

  return success(data, origin);
});

router.get('/me', async (event) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const result = await client.query(
      `SELECT p.*, up.email, up.first_name, up.last_name, up.phone,
              up.date_of_birth, up.gender, up.profile_photo_url,
              up.address_line1, up.address_line2, up.city, up.province,
              up.postal_code, up.country, up.language_preference
       FROM providers p
       JOIN user_profiles up ON p.user_id = up.id
       WHERE p.user_id = $1`,
      [user.userId]
    );
    return result.rows[0] || null;
  });

  if (!data) return notFound('Provider profile not found', origin);
  return success(data, origin);
});

router.get('/by-specialty/:specialtyName', async (event, params) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);
  const specialtyName = decodeURIComponent(params?.specialtyName || '');

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const result = await client.query(
      `SELECT p.*, up.first_name, up.last_name, up.profile_photo_url,
              up.city, up.province,
              COALESCE(json_agg(DISTINCT ps.*) FILTER (WHERE ps.id IS NOT NULL), '[]') as specialties,
              COALESCE(json_agg(DISTINCT pl.*) FILTER (WHERE pl.id IS NOT NULL), '[]') as locations
       FROM providers p
       JOIN user_profiles up ON p.user_id = up.id
       LEFT JOIN provider_specialties ps ON p.id = ps.provider_id
       LEFT JOIN provider_locations pl ON p.id = pl.provider_id
       WHERE p.is_active = true AND p.is_verified = true
         AND ps.specialty ILIKE $1
       GROUP BY p.id, up.id
       ORDER BY p.rating_average DESC`,
      [`%${specialtyName}%`]
    );
    return result.rows;
  });

  return success(data, origin);
});

router.get('/by-procedure/:procedureId', async (event, params) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const result = await client.query(
      `SELECT p.*, up.first_name, up.last_name, up.profile_photo_url,
              up.city, up.province,
              COALESCE(json_agg(DISTINCT pl.*) FILTER (WHERE pl.id IS NOT NULL), '[]') as locations
       FROM providers p
       JOIN user_profiles up ON p.user_id = up.id
       LEFT JOIN provider_locations pl ON p.id = pl.provider_id
       WHERE p.is_active = true AND p.is_verified = true
       GROUP BY p.id, up.id
       ORDER BY p.rating_average DESC
       LIMIT 20`,
      []
    );
    return result.rows;
  });

  return success(data, origin);
});

router.get('/:id', async (event, params) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const result = await client.query(
      `SELECT p.*, up.first_name, up.last_name, up.profile_photo_url,
              up.city, up.province, up.language_preference,
              COALESCE(
                json_agg(DISTINCT jsonb_build_object(
                  'id', ps.id, 'specialty_name', ps.specialty, 'is_primary', ps.is_primary
                )) FILTER (WHERE ps.id IS NOT NULL), '[]'
              ) as specialties,
              COALESCE(
                json_agg(DISTINCT jsonb_build_object(
                  'id', pl.id, 'name', pl.location_name, 'address', pl.address_line1,
                  'city', pl.city, 'province', pl.province, 'is_primary', pl.is_primary
                )) FILTER (WHERE pl.id IS NOT NULL), '[]'
              ) as locations
       FROM providers p
       JOIN user_profiles up ON p.user_id = up.id
       LEFT JOIN provider_specialties ps ON p.id = ps.provider_id
       LEFT JOIN provider_locations pl ON p.id = pl.provider_id
       WHERE p.id = $1
       GROUP BY p.id, up.id`,
      [params.id]
    );
    return result.rows[0] || null;
  });

  if (!data) return notFound('Provider not found', origin);
  return success(data, origin);
});

router.put('/me', async (event) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);
  const body = parseBody<Record<string, unknown>>(event.body);

  const allowedFields = [
    'license_number', 'license_province', 'license_expiry', 'npi_number',
    'bio', 'years_of_experience', 'education',
    'accepts_new_patients', 'telemedicine_enabled', 'languages_spoken',
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
  values.push(user.userId);

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const result = await client.query(
      `UPDATE providers SET ${updates.join(', ')}, updated_at = now()
       WHERE user_id = $${paramIndex}
       RETURNING *`,
      values
    );
    return result.rows[0];
  });

  return success(data, origin);
});

router.get('/:id/schedule', async (event, params) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const result = await client.query(
      `SELECT * FROM provider_schedules WHERE provider_id = $1 AND is_available = true
       ORDER BY day_of_week, start_time`,
      [params.id]
    );
    return result.rows;
  });

  return success(data, origin);
});

router.get('/:id/reviews', async (event, params) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const result = await client.query(
      `SELECT pr.*, up.first_name, up.last_name
       FROM provider_reviews pr
       JOIN patients p ON pr.patient_id = p.id
       JOIN user_profiles up ON p.user_id = up.id
       WHERE pr.provider_id = $1 AND pr.is_published = true
       ORDER BY pr.created_at DESC LIMIT 50`,
      [params.id]
    );
    return result.rows;
  });

  return success(data, origin);
});

const publicRouter = new Router('/public');

publicRouter.get('/specialties', async (event) => {
  const origin = getOrigin(event.headers);
  const result = await withRLS('anonymous', 'anon', {}, async (client) => {
    const r = await client.query(`SELECT id, name, slug, description, icon, category FROM specialties_master ORDER BY name ASC`);
    return r.rows;
  });
  return success(result, origin);
});

publicRouter.get('/procedures', async (event) => {
  const origin = getOrigin(event.headers);
  const includeAll = getQueryParam(event.queryStringParameters, 'all') === 'true';
  const result = await withRLS('anonymous', 'anon', {}, async (client) => {
    let query = `SELECT * FROM procedures_master WHERE is_active = true`;
    if (!includeAll) query += ` AND is_common = true`;
    query += ` ORDER BY display_order ASC`;
    const r = await client.query(query);
    return r.rows;
  });
  return success(result, origin);
});

publicRouter.get('/providers', async (event) => {
  const origin = getOrigin(event.headers);
  const specialty = getQueryParam(event.queryStringParameters, 'specialty');
  const city = getQueryParam(event.queryStringParameters, 'city');
  const search = getQueryParam(event.queryStringParameters, 'search');
  const limit = parseInt(getQueryParam(event.queryStringParameters, 'limit') || '20', 10);
  const offset = parseInt(getQueryParam(event.queryStringParameters, 'offset') || '0', 10);

  const result = await withRLS('anonymous', 'anon', {}, async (client) => {
    let query = `
      SELECT p.*, up.first_name, up.last_name, up.profile_photo_url, up.city, up.province,
             COALESCE(
               json_agg(DISTINCT ps.specialty) FILTER (WHERE ps.id IS NOT NULL), '[]'
             ) as specialties
      FROM providers p
      JOIN user_profiles up ON p.user_id = up.id
      LEFT JOIN provider_specialties ps ON p.id = ps.provider_id
      WHERE p.is_active = true AND p.is_verified = true
    `;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (specialty) {
      query += ` AND ps.specialty ILIKE $${paramIndex}`;
      params.push(`%${specialty}%`);
      paramIndex++;
    }
    if (city) {
      query += ` AND up.city ILIKE $${paramIndex}`;
      params.push(`%${city}%`);
      paramIndex++;
    }
    if (search) {
      query += ` AND (up.first_name ILIKE $${paramIndex} OR up.last_name ILIKE $${paramIndex} OR ps.specialty ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` GROUP BY p.id, up.id ORDER BY p.created_at DESC`;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const r = await client.query(query, params);
    return r.rows;
  });
  return success(result, origin);
});

publicRouter.get('/insurance-providers', async (event) => {
  const origin = getOrigin(event.headers);
  const result = await withRLS('anonymous', 'anon', {}, async (client) => {
    const r = await client.query(
      `SELECT id, name, slug, logo_url, provider_type, provinces_covered 
       FROM insurance_providers_master 
       WHERE is_active = true 
       ORDER BY name ASC`
    );
    return r.rows;
  });
  return success(result, origin);
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  if (event.path?.startsWith('/public')) return publicRouter.handle(event);
  return router.handle(event);
};
