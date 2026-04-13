import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Router } from '../../shared/router';
import { requireAuth } from '../../shared/auth';
import { withRLS } from '../../shared/db';
import {
  success, created, badRequest, notFound,
  parseBody, getOrigin, getQueryParam,
} from '../../shared/response';

const router = new Router('/pharmacy');

router.get('/', async (event) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);
  const search = getQueryParam(event.queryStringParameters, 'search');
  const city = getQueryParam(event.queryStringParameters, 'city');

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    let query = `SELECT * FROM pharmacies WHERE is_active = true`;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND name ILIKE $${paramIndex}`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (city) {
      query += ` AND city ILIKE $${paramIndex}`;
      params.push(`%${city}%`);
      paramIndex++;
    }

    query += ` ORDER BY name LIMIT 50`;
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
      `SELECT * FROM pharmacies WHERE owner_user_id = $1`, [user.userId]
    );
    return result.rows[0] || null;
  });

  if (!data) return notFound('Pharmacy profile not found', origin);
  return success(data, origin);
});

router.get('/:id', async (event, params) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const result = await client.query(
      `SELECT * FROM pharmacies WHERE id = $1`, [params.id]
    );
    return result.rows[0] || null;
  });

  if (!data) return notFound('Pharmacy not found', origin);
  return success(data, origin);
});

router.get('/:id/inventory', async (event, params) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);
  const search = getQueryParam(event.queryStringParameters, 'search');
  const lowStock = getQueryParam(event.queryStringParameters, 'low_stock');

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    let query = `SELECT * FROM pharmacy_inventory WHERE pharmacy_id = $1`;
    const queryParams: unknown[] = [params.id];
    let paramIndex = 2;

    if (search) {
      query += ` AND (medication_name ILIKE $${paramIndex} OR generic_name ILIKE $${paramIndex} OR brand_name ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (lowStock === 'true') {
      query += ` AND quantity_in_stock <= reorder_level`;
    }

    query += ` ORDER BY medication_name LIMIT 100`;
    const result = await client.query(query, queryParams);
    return result.rows;
  });

  return success(data, origin);
});

router.post('/:id/inventory', async (event, params) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);
  const body = parseBody<{
    medication_name: string;
    generic_name?: string;
    brand_name?: string;
    din?: string;
    quantity_in_stock: number;
    unit_price: number;
    reorder_level?: number;
  }>(event.body);

  if (!body.medication_name || body.quantity_in_stock === undefined || body.unit_price === undefined) {
    return badRequest('Medication name, quantity, and unit price are required', origin);
  }

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const result = await client.query(
      `INSERT INTO pharmacy_inventory
       (pharmacy_id, medication_name, generic_name, brand_name, din,
        quantity_in_stock, unit_price, reorder_level, is_available)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
       RETURNING *`,
      [params.id, body.medication_name, body.generic_name, body.brand_name,
       body.din, body.quantity_in_stock, body.unit_price, body.reorder_level || 10]
    );
    return result.rows[0];
  });

  return created(data, origin);
});

router.get('/:id/orders', async (event, params) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);
  const status = getQueryParam(event.queryStringParameters, 'status');

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    let query = `
      SELECT po.*,
        json_build_object('first_name', up.first_name, 'last_name', up.last_name) as patient_info
      FROM pharmacy_orders po
      LEFT JOIN patients p ON po.patient_id = p.id
      LEFT JOIN user_profiles up ON p.user_id = up.id
      WHERE po.pharmacy_id = $1
    `;
    const queryParams: unknown[] = [params.id];
    let paramIndex = 2;

    if (status) {
      query += ` AND po.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    query += ` ORDER BY po.created_at DESC LIMIT 100`;
    const result = await client.query(query, queryParams);
    return result.rows;
  });

  return success(data, origin);
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return router.handle(event);
};
