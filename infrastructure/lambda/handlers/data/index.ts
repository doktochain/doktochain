import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { extractUser } from '../../shared/auth';
import { withRLS, withServiceRole } from '../../shared/db';
import {
  success, badRequest, notFound, error,
  parseBody, getOrigin, getQueryParam,
} from '../../shared/response';

const TABLE_ALLOWLIST = new Set([
  'staff_roles', 'staff_permissions', 'role_permissions', 'staff_members',
  'staff_activity_logs', 'staff_performance_metrics',
  'user_profiles', 'user_roles', 'user_settings', 'user_privacy_settings',
  'user_accessibility_settings', 'trusted_devices',
  'patients', 'patient_allergies', 'patient_medications', 'emergency_contacts',
  'patient_insurance_cards', 'patient_consents',
  'child_profiles', 'guardian_relationships', 'child_growth_records',
  'child_developmental_milestones', 'child_vaccinations',
  'providers', 'provider_specialties', 'provider_procedures', 'provider_languages',
  'provider_time_blocks', 'provider_unavailability', 'provider_insurance_plans',
  'provider_billing_integrations', 'provider_credentials', 'provider_schedules',
  'provider_reviews', 'provider_locations', 'provider_time_slots',
  'provider_notifications', 'provider_notification_preferences',
  'provider_verification_history', 'provider_onboarding_applications',
  'provider_favorite_codes', 'provider_digital_signatures',
  'provider_clinic_affiliations', 'clinic_provider_invitations',
  'appointments', 'appointment_notes', 'appointment_questionnaire_responses',
  'appointment_consent_forms', 'appointment_reminders', 'appointment_documents',
  'appointment_cancellations', 'waitlist_entries',
  'prescriptions', 'prescription_items', 'prescription_refills',
  'e_prescriptions', 'prescription_refill_requests', 'pharmacy_communications',
  'pharmacies', 'pharmacy_inventory', 'pharmacy_orders', 'order_items',
  'order_status_history', 'pharmacy_staff',
  'clinical_notes', 'clinical_note_attachments', 'clinical_templates',
  'clinical_data_hashes', 'soap_notes',
  'fhir_observations', 'fhir_conditions', 'fhir_medication_requests',
  'fhir_allergy_intolerances', 'fhir_procedures', 'fhir_resources',
  'immunizations', 'icd10_codes', 'procedure_codes',
  'lab_results', 'medication_history', 'allergies',
  'medication_reminders', 'medication_adherence_log', 'medication_logs',
  'medical_records', 'record_shares', 'health_record_sync_status',
  'blockchain_audit_log', 'blockchain_integrity_checks', 'blockchain_nodes',
  'audit_failures',
  'video_consultations', 'consultation_messages', 'consultation_feedback',
  'secure_messages', 'telemedicine_sessions', 'session_participants',
  'session_chat_messages', 'session_files', 'ai_soap_notes',
  'virtual_waiting_room',
  'messages', 'message_conversations', 'message_templates',
  'staff_chat_channels', 'staff_chat_messages',
  'notifications', 'notification_preferences',
  'clinics', 'clinic_services', 'clinic_specializations', 'clinic_staff',
  'referrals',
  'billing_transactions', 'provider_settlements', 'provider_payouts',
  'insurance_claims', 'insurance_policies', 'payment_methods', 'invoices',
  'platform_expenses', 'platform_invoices', 'platform_invoice_items',
  'platform_income', 'subscription_plans', 'subscriptions',
  'departments', 'designations', 'staff_attendance', 'leave_types',
  'leave_requests', 'holidays', 'salary_structures', 'payslips',
  'help_articles', 'help_article_categories', 'support_tickets',
  'support_ticket_messages',
  'cms_pages', 'cms_blogs', 'cms_testimonials', 'cms_faqs',
  'cms_faq_categories', 'cms_blog_categories', 'cms_blog_tags',
  'cms_locations_content', 'cms_media',
  'admin_flags', 'moderation_logs', 'system_analytics',
  'content_moderation_queue',
  'custom_roles', 'custom_role_permissions', 'user_custom_roles',
  'custom_tables_registry', 'custom_table_columns',
  'custom_table_permissions', 'custom_table_audit_log',
  'email_verification_codes', 'phone_verification_codes',
  'fhir_endpoints', 'fhir_sync_logs', 'provincial_ehr_integrations',
  'fhir_medication_knowledge',
  'medical_services', 'procedures_master', 'specialties_master',
  'insurance_providers_master', 'products_master',
  'clinic_locations', 'medical_assets', 'provider_availability',
]);

function kebabToSnake(kebab: string): string {
  return kebab.replace(/-/g, '_');
}

function isAllowedTable(table: string): boolean {
  return TABLE_ALLOWLIST.has(table);
}

function sanitizeColumnName(name: string): string {
  if (!/^[a-z_][a-z0-9_]*$/i.test(name)) {
    throw new Error(`Invalid column name: ${name}`);
  }
  return name;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const origin = getOrigin(event.headers);
  const method = event.httpMethod;
  const path = event.path || '';

  if (method === 'OPTIONS') {
    return success(null, origin);
  }

  const PUBLIC_READ_TABLES = new Set([
    'subscription_plans', 'cms_pages', 'cms_blogs', 'cms_testimonials',
    'cms_faqs', 'cms_faq_categories', 'cms_blog_categories', 'cms_blog_tags',
    'cms_locations_content', 'specialties_master', 'medical_services',
  ]);

  try {
    const pathMatch = path.match(/^\/(?:public-)?data\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?$/);
    if (!pathMatch) {
      return badRequest('Invalid path format. Expected /data/{table} or /data/{table}/{id}', origin);
    }

    const isPublicPath = path.startsWith('/public-data/');
    const tableKebab = pathMatch[1];
    const recordId = pathMatch[2];
    const table = kebabToSnake(tableKebab);

    if (!isAllowedTable(table)) {
      return badRequest(`Table '${table}' is not accessible`, origin);
    }

    if (isPublicPath && !PUBLIC_READ_TABLES.has(table)) {
      return badRequest(`Table '${table}' is not publicly accessible`, origin);
    }

    if (isPublicPath && method !== 'GET') {
      return error('Public endpoint only supports GET', 405, origin);
    }

    const user = extractUser(event);
    if (!user && !isPublicPath) {
      return error('Authentication required', 401, origin);
    }

    const dbFn = user
      ? (fn: (client: any) => Promise<any>) => withRLS(user.userId, user.role, user.claims, fn)
      : withServiceRole;

    const data = await dbFn(async (client) => {
      switch (method) {
        case 'GET': {
          if (recordId) {
            const result = await client.query(
              `SELECT * FROM ${table} WHERE id = $1`, [recordId]
            );
            return result.rows[0] || null;
          }

          let query = `SELECT * FROM ${table} WHERE 1=1`;
          const params: unknown[] = [];
          let paramIndex = 1;

          const qs = event.queryStringParameters || {};
          const orderBy = qs.order;
          const limitVal = qs.limit;
          const countOnly = qs.count === 'true';

          for (const [key, value] of Object.entries(qs)) {
            if (['order', 'limit', 'offset', 'count', 'expand'].includes(key)) continue;
            if (value === undefined) continue;

            if (key.endsWith('_gte')) {
              const col = sanitizeColumnName(key.slice(0, -4));
              query += ` AND ${col} >= $${paramIndex}`;
              params.push(value);
              paramIndex++;
            } else if (key.endsWith('_lte')) {
              const col = sanitizeColumnName(key.slice(0, -4));
              query += ` AND ${col} <= $${paramIndex}`;
              params.push(value);
              paramIndex++;
            } else if (key.endsWith('_ilike')) {
              const col = sanitizeColumnName(key.slice(0, -6));
              query += ` AND ${col} ILIKE $${paramIndex}`;
              params.push(`%${value}%`);
              paramIndex++;
            } else if (key.endsWith('_in')) {
              const col = sanitizeColumnName(key.slice(0, -3));
              const vals = value.split(',');
              const placeholders = vals.map((_: string, i: number) => `$${paramIndex + i}`).join(',');
              query += ` AND ${col} IN (${placeholders})`;
              vals.forEach((v: string) => params.push(v));
              paramIndex += vals.length;
            } else {
              const col = sanitizeColumnName(key);
              query += ` AND ${col} = $${paramIndex}`;
              params.push(value);
              paramIndex++;
            }
          }

          if (countOnly) {
            const countQuery = query.replace('SELECT *', 'SELECT count(*)');
            const result = await client.query(countQuery, params);
            return { count: parseInt(result.rows[0].count) };
          }

          if (orderBy) {
            const parts = orderBy.split(':');
            const col = sanitizeColumnName(parts[0]);
            const dir = parts[1] === 'asc' ? 'ASC' : 'DESC';
            query += ` ORDER BY ${col} ${dir}`;
          } else {
            const hasCreatedAt = await client.query(
              `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = 'created_at' LIMIT 1`,
              [table]
            );
            if (hasCreatedAt.rows.length > 0) {
              query += ` ORDER BY created_at DESC`;
            }
          }

          if (limitVal) {
            query += ` LIMIT $${paramIndex}`;
            params.push(parseInt(limitVal));
            paramIndex++;
          }

          const offsetVal = qs.offset;
          if (offsetVal) {
            query += ` OFFSET $${paramIndex}`;
            params.push(parseInt(offsetVal));
            paramIndex++;
          }

          const result = await client.query(query, params);
          return result.rows;
        }

        case 'POST': {
          const body = parseBody<Record<string, unknown>>(event.body);
          const isUpsert = body._upsert === true;
          delete body._upsert;

          const keys = Object.keys(body).map(sanitizeColumnName);
          const values = Object.values(body);

          if (keys.length === 0) {
            throw new Error('Request body must contain at least one field');
          }

          const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
          const columns = keys.join(', ');

          let sql: string;
          if (isUpsert) {
            const updateCols = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
            sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})
                   ON CONFLICT (id) DO UPDATE SET ${updateCols}
                   RETURNING *`;
          } else {
            sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`;
          }

          const result = await client.query(sql, values);
          return result.rows[0];
        }

        case 'PUT': {
          if (!recordId) {
            const body = parseBody<Record<string, unknown>>(event.body);
            const qs = event.queryStringParameters || {};

            if (Object.keys(qs).length > 0) {
              const keys = Object.keys(body).map(sanitizeColumnName);
              const values = Object.values(body);
              const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');

              let query = `UPDATE ${table} SET ${setClauses}, updated_at = now() WHERE 1=1`;
              let paramIndex = keys.length + 1;

              for (const [key, value] of Object.entries(qs)) {
                if (value === undefined) continue;
                const col = sanitizeColumnName(key);
                query += ` AND ${col} = $${paramIndex}`;
                values.push(value);
                paramIndex++;
              }

              query += ` RETURNING *`;
              const result = await client.query(query, values);
              return result.rows;
            }

            throw new Error('PUT requires an ID or query parameters');
          }

          const body = parseBody<Record<string, unknown>>(event.body);
          const keys = Object.keys(body).map(sanitizeColumnName);
          const values = Object.values(body);
          const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
          values.push(recordId);

          const result = await client.query(
            `UPDATE ${table} SET ${setClauses}, updated_at = now() WHERE id = $${values.length} RETURNING *`,
            values
          );
          return result.rows[0] || null;
        }

        case 'DELETE': {
          if (recordId) {
            await client.query(`DELETE FROM ${table} WHERE id = $1`, [recordId]);
            return { deleted: true };
          }

          const qs = event.queryStringParameters || {};
          if (Object.keys(qs).length > 0) {
            let query = `DELETE FROM ${table} WHERE 1=1`;
            const params: unknown[] = [];
            let paramIndex = 1;

            for (const [key, value] of Object.entries(qs)) {
              if (value === undefined) continue;
              const col = sanitizeColumnName(key);
              query += ` AND ${col} = $${paramIndex}`;
              params.push(value);
              paramIndex++;
            }

            await client.query(query, params);
            return { deleted: true };
          }

          throw new Error('DELETE requires an ID or query parameters');
        }

        default:
          throw new Error(`Method ${method} not supported`);
      }
    });

    if (data === null && method === 'GET' && recordId) {
      return notFound('Record not found', origin);
    }

    return success(data, origin);
  } catch (err) {
    console.error('Data handler error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    const status = message.includes('not accessible') || message.includes('Invalid') ? 400 : 500;
    return error(message, status, origin);
  }
};
