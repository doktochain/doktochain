import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { extractUser } from '../../shared/auth';
import { withRLS, withServiceRole } from '../../shared/db';
import {
  success, badRequest, error,
  parseBody, getOrigin,
} from '../../shared/response';

const RPC_HANDLERS: Record<string, (client: any, params: any) => Promise<any>> = {
  increment_template_usage: async (client, params) => {
    const { template_id } = params;
    await client.query(
      `UPDATE message_templates SET usage_count = COALESCE(usage_count, 0) + 1 WHERE id = $1`,
      [template_id]
    );
    return { success: true };
  },

  increment_article_count: async (client, params) => {
    const { article_id } = params;
    await client.query(
      `UPDATE help_articles SET view_count = COALESCE(view_count, 0) + 1 WHERE id = $1`,
      [article_id]
    );
    return { success: true };
  },

  'increment-download-count': async (client, params) => {
    const { file_id } = params;
    await client.query(
      `UPDATE session_files SET download_count = COALESCE(download_count, 0) + 1 WHERE id = $1`,
      [file_id]
    );
    return { success: true };
  },

  check_user_permission: async (client, params) => {
    const { user_id, permission_name } = params;
    const result = await client.query(
      `SELECT EXISTS(
        SELECT 1 FROM user_custom_roles ucr
        JOIN custom_role_permissions crp ON ucr.role_id = crp.role_id
        JOIN staff_permissions sp ON crp.permission_id = sp.id
        WHERE ucr.user_id = $1 AND sp.permission_name = $2
      ) as has_permission`,
      [user_id, permission_name]
    );
    return { has_permission: result.rows[0]?.has_permission || false };
  },

  fix_db_triggers: async (_client, _params) => {
    return await withServiceRole(async (svc) => {
      await svc.query(`
        CREATE OR REPLACE FUNCTION notify_appointment_created()
        RETURNS TRIGGER AS $$
        DECLARE
          patient_user_id uuid;
          provider_user_id uuid;
          provider_name text;
          patient_name text;
        BEGIN
          SELECT user_id INTO patient_user_id FROM patients WHERE id = NEW.patient_id;
          SELECT p.user_id, up.first_name || ' ' || up.last_name
          INTO provider_user_id, provider_name
          FROM providers p LEFT JOIN user_profiles up ON p.user_id = up.id
          WHERE p.id = NEW.provider_id;
          SELECT up.first_name || ' ' || up.last_name INTO patient_name
          FROM patients p LEFT JOIN user_profiles up ON p.user_id = up.id
          WHERE p.id = NEW.patient_id;

          IF patient_user_id IS NOT NULL THEN
            INSERT INTO notifications (user_id, notification_type, title, message, is_read)
            VALUES (patient_user_id, 'appointment',
              'Appointment Confirmed',
              'Your appointment with Dr. ' || COALESCE(provider_name, 'Unknown') || ' on ' ||
              TO_CHAR(NEW.appointment_date, 'Month DD, YYYY') || ' at ' ||
              TO_CHAR(NEW.start_time, 'HH12:MI AM') || ' has been scheduled.',
              false);
          END IF;

          IF provider_user_id IS NOT NULL THEN
            INSERT INTO notifications (user_id, notification_type, title, message, is_read)
            VALUES (provider_user_id, 'appointment',
              'New Appointment Booked',
              'New appointment with ' || COALESCE(patient_name, 'Patient') || ' on ' ||
              TO_CHAR(NEW.appointment_date, 'Month DD, YYYY') || ' at ' ||
              TO_CHAR(NEW.start_time, 'HH12:MI AM') || '.',
              false);
          END IF;

          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `);

      await svc.query(`
        CREATE OR REPLACE FUNCTION set_prescription_defaults()
        RETURNS TRIGGER AS $$
        BEGIN
          IF NEW.prescription_number IS NULL OR NEW.prescription_number = 'RX-PENDING' THEN
            NEW.prescription_number := 'RX-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 8);
          END IF;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await svc.query(`
        CREATE OR REPLACE FUNCTION notify_appointment_updated()
        RETURNS TRIGGER AS $$
        DECLARE
          patient_user_id uuid;
          provider_user_id uuid;
          provider_name text;
          notification_title text;
          notification_message text;
        BEGIN
          IF OLD.status = NEW.status AND OLD.appointment_date = NEW.appointment_date AND OLD.start_time = NEW.start_time THEN
            RETURN NEW;
          END IF;

          SELECT user_id INTO patient_user_id FROM patients WHERE id = NEW.patient_id;
          SELECT p.user_id, up.first_name || ' ' || up.last_name
          INTO provider_user_id, provider_name
          FROM providers p LEFT JOIN user_profiles up ON p.user_id = up.id
          WHERE p.id = NEW.provider_id;

          CASE NEW.status
            WHEN 'confirmed' THEN
              notification_title := 'Appointment Confirmed';
              notification_message := 'Your appointment on ' || TO_CHAR(NEW.appointment_date, 'Month DD, YYYY') || ' has been confirmed.';
            WHEN 'cancelled' THEN
              notification_title := 'Appointment Cancelled';
              notification_message := 'Your appointment on ' || TO_CHAR(NEW.appointment_date, 'Month DD, YYYY') || ' has been cancelled.';
            WHEN 'completed' THEN
              notification_title := 'Appointment Completed';
              notification_message := 'Your appointment with Dr. ' || COALESCE(provider_name, 'Unknown') || ' is complete.';
            ELSE
              notification_title := 'Appointment Updated';
              notification_message := 'Your appointment has been updated.';
          END CASE;

          IF patient_user_id IS NOT NULL AND OLD.status != NEW.status THEN
            INSERT INTO notifications (user_id, notification_type, title, message, is_read)
            VALUES (patient_user_id, 'appointment', notification_title, notification_message, false);
          END IF;

          IF provider_user_id IS NOT NULL AND OLD.status != NEW.status THEN
            INSERT INTO notifications (user_id, notification_type, title, message, is_read)
            VALUES (provider_user_id, 'appointment', notification_title, notification_message, false);
          END IF;

          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `);

      return { fixed: ['notify_appointment_created', 'notify_appointment_updated', 'set_prescription_defaults'] };
    });
  },

  get_user_accessible_paths: async (client, params) => {
    const { user_id } = params;
    const result = await client.query(
      `SELECT DISTINCT sp.permission_name
       FROM user_custom_roles ucr
       JOIN custom_role_permissions crp ON ucr.role_id = crp.role_id
       JOIN staff_permissions sp ON crp.permission_id = sp.id
       WHERE ucr.user_id = $1`,
      [user_id]
    );
    return result.rows.map((r: any) => r.permission_name);
  },
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const origin = getOrigin(event.headers);

  if (event.httpMethod === 'OPTIONS') {
    return success(null, origin);
  }

  if (event.httpMethod !== 'POST') {
    return badRequest('RPC endpoints only accept POST requests', origin);
  }

  try {
    const user = extractUser(event);
    if (!user) {
      return error('Authentication required', 401, origin);
    }

    const path = event.path || '';
    const funcMatch = path.match(/^\/rpc\/(.+)$/);
    if (!funcMatch) {
      return badRequest('Invalid RPC path. Expected /rpc/{function_name}', origin);
    }

    const funcName = funcMatch[1];
    const rpcHandler = RPC_HANDLERS[funcName];

    if (!rpcHandler) {
      return badRequest(`Unknown RPC function: ${funcName}`, origin);
    }

    const body = parseBody<Record<string, unknown>>(event.body);

    const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
      return rpcHandler(client, body);
    });

    return success(data, origin);
  } catch (err) {
    console.error('RPC handler error:', err);
    return error(
      err instanceof Error ? err.message : 'Internal server error',
      500,
      origin
    );
  }
};
