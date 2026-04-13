import { PostConfirmationTriggerEvent } from 'aws-lambda';
import { withServiceRole } from '../../shared/db';

export const handler = async (event: PostConfirmationTriggerEvent): Promise<PostConfirmationTriggerEvent> => {
  if (event.triggerSource !== 'PostConfirmation_ConfirmSignUp') {
    return event;
  }

  const userId = event.request.userAttributes.sub;
  const email = event.request.userAttributes.email;

  try {
    await withServiceRole(async (client) => {
      await client.query(
        `INSERT INTO auth.users (id, email, created_at, updated_at)
         VALUES ($1, $2, now(), now())
         ON CONFLICT (id) DO UPDATE SET email = $2, updated_at = now()`,
        [userId, email]
      );
    });
  } catch (err) {
    console.error('Failed to sync user to auth.users:', err);
  }

  return event;
};
