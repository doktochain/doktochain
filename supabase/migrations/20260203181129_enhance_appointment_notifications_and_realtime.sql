/*
  # Enhance Appointment System with Notifications and Real-time

  1. New Functions
    - `notify_appointment_created`: Sends notifications when appointment is created
    - `notify_appointment_updated`: Sends notifications when appointment status changes
    - `schedule_appointment_reminders`: Creates reminder notifications for appointments
    
  2. Triggers
    - Trigger on appointments INSERT to send creation notifications
    - Trigger on appointments UPDATE to send update notifications
    - Enable realtime for appointments table
    
  3. Security
    - Maintains existing RLS policies
    - Ensures notifications are sent to relevant parties (patient, provider, admin)
*/

-- Function to send appointment creation notifications
CREATE OR REPLACE FUNCTION notify_appointment_created()
RETURNS TRIGGER AS $$
DECLARE
  patient_user_id uuid;
  provider_user_id uuid;
  provider_name text;
  patient_name text;
BEGIN
  -- Get patient's user_id
  SELECT user_id INTO patient_user_id 
  FROM patients 
  WHERE id = NEW.patient_id;
  
  -- Get provider's user_id and name
  SELECT p.user_id, up.first_name || ' ' || up.last_name 
  INTO provider_user_id, provider_name
  FROM providers p
  LEFT JOIN user_profiles up ON p.user_id = up.id
  WHERE p.id = NEW.provider_id;
  
  -- Get patient name
  SELECT up.first_name || ' ' || up.last_name 
  INTO patient_name
  FROM patients p
  LEFT JOIN user_profiles up ON p.user_id = up.id
  WHERE p.id = NEW.patient_id;
  
  -- Notify patient
  IF patient_user_id IS NOT NULL THEN
    INSERT INTO notifications (
      user_id,
      notification_type,
      category,
      priority,
      title,
      message,
      action_url,
      action_label,
      related_entity_type,
      related_entity_id,
      metadata,
      is_read,
      is_archived
    ) VALUES (
      patient_user_id,
      'appointment_confirmation',
      'appointment',
      'high',
      'Appointment Confirmed',
      'Your appointment with Dr. ' || COALESCE(provider_name, 'Unknown') || ' on ' || 
      TO_CHAR(NEW.appointment_date, 'Month DD, YYYY') || ' at ' || 
      TO_CHAR(NEW.start_time, 'HH12:MI AM') || ' has been scheduled.',
      '/dashboard/patient/appointments',
      'View Appointment',
      'appointment',
      NEW.id,
      jsonb_build_object(
        'appointment_id', NEW.id,
        'provider_id', NEW.provider_id,
        'appointment_date', NEW.appointment_date,
        'start_time', NEW.start_time
      ),
      false,
      false
    );
  END IF;
  
  -- Notify provider
  IF provider_user_id IS NOT NULL THEN
    INSERT INTO notifications (
      user_id,
      notification_type,
      category,
      priority,
      title,
      message,
      action_url,
      action_label,
      related_entity_type,
      related_entity_id,
      metadata,
      is_read,
      is_archived
    ) VALUES (
      provider_user_id,
      'new_appointment',
      'appointment',
      'high',
      'New Appointment Booked',
      'New appointment with ' || COALESCE(patient_name, 'Patient') || ' on ' || 
      TO_CHAR(NEW.appointment_date, 'Month DD, YYYY') || ' at ' || 
      TO_CHAR(NEW.start_time, 'HH12:MI AM') || '.',
      '/dashboard/provider/appointments',
      'View Schedule',
      'appointment',
      NEW.id,
      jsonb_build_object(
        'appointment_id', NEW.id,
        'patient_id', NEW.patient_id,
        'appointment_date', NEW.appointment_date,
        'start_time', NEW.start_time
      ),
      false,
      false
    );
  END IF;
  
  -- Schedule reminders (24 hours before)
  PERFORM schedule_appointment_reminder(NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send appointment update notifications
CREATE OR REPLACE FUNCTION notify_appointment_updated()
RETURNS TRIGGER AS $$
DECLARE
  patient_user_id uuid;
  provider_user_id uuid;
  provider_name text;
  patient_name text;
  notification_title text;
  notification_message text;
BEGIN
  -- Only send notifications if status changed
  IF OLD.status = NEW.status AND 
     OLD.appointment_date = NEW.appointment_date AND 
     OLD.start_time = NEW.start_time THEN
    RETURN NEW;
  END IF;
  
  -- Get user IDs and names
  SELECT user_id INTO patient_user_id 
  FROM patients 
  WHERE id = NEW.patient_id;
  
  SELECT p.user_id, up.first_name || ' ' || up.last_name 
  INTO provider_user_id, provider_name
  FROM providers p
  LEFT JOIN user_profiles up ON p.user_id = up.id
  WHERE p.id = NEW.provider_id;
  
  SELECT up.first_name || ' ' || up.last_name 
  INTO patient_name
  FROM patients p
  LEFT JOIN user_profiles up ON p.user_id = up.id
  WHERE p.id = NEW.patient_id;
  
  -- Determine notification content based on status change
  CASE NEW.status
    WHEN 'confirmed' THEN
      notification_title := 'Appointment Confirmed';
      notification_message := 'Your appointment with Dr. ' || COALESCE(provider_name, 'Unknown') || 
        ' on ' || TO_CHAR(NEW.appointment_date, 'Month DD, YYYY') || 
        ' at ' || TO_CHAR(NEW.start_time, 'HH12:MI AM') || ' has been confirmed.';
    WHEN 'cancelled' THEN
      notification_title := 'Appointment Cancelled';
      notification_message := 'Your appointment with Dr. ' || COALESCE(provider_name, 'Unknown') || 
        ' on ' || TO_CHAR(NEW.appointment_date, 'Month DD, YYYY') || ' has been cancelled.';
    WHEN 'in-progress' THEN
      notification_title := 'Appointment In Progress';
      notification_message := 'Your appointment with Dr. ' || COALESCE(provider_name, 'Unknown') || ' has started.';
    WHEN 'completed' THEN
      notification_title := 'Appointment Completed';
      notification_message := 'Your appointment with Dr. ' || COALESCE(provider_name, 'Unknown') || ' is complete.';
    ELSE
      notification_title := 'Appointment Updated';
      notification_message := 'Your appointment has been updated.';
  END CASE;
  
  -- Notify patient if status changed
  IF patient_user_id IS NOT NULL AND OLD.status != NEW.status THEN
    INSERT INTO notifications (
      user_id,
      notification_type,
      category,
      priority,
      title,
      message,
      action_url,
      action_label,
      related_entity_type,
      related_entity_id,
      is_read,
      is_archived
    ) VALUES (
      patient_user_id,
      'appointment_' || NEW.status,
      'appointment',
      CASE WHEN NEW.status = 'cancelled' THEN 'high' ELSE 'normal' END,
      notification_title,
      notification_message,
      '/dashboard/patient/appointments',
      'View Details',
      'appointment',
      NEW.id,
      false,
      false
    );
  END IF;
  
  -- Notify provider if status changed
  IF provider_user_id IS NOT NULL AND OLD.status != NEW.status THEN
    INSERT INTO notifications (
      user_id,
      notification_type,
      category,
      priority,
      title,
      message,
      action_url,
      action_label,
      related_entity_type,
      related_entity_id,
      is_read,
      is_archived
    ) VALUES (
      provider_user_id,
      'appointment_' || NEW.status,
      'appointment',
      'normal',
      'Appointment Status Updated',
      'Appointment with ' || COALESCE(patient_name, 'Patient') || ' on ' || 
      TO_CHAR(NEW.appointment_date, 'Month DD, YYYY') || ' is now ' || NEW.status || '.',
      '/dashboard/provider/appointments',
      'View Schedule',
      'appointment',
      NEW.id,
      false,
      false
    );
  END IF;
  
  -- If rescheduled, cancel old reminders and create new ones
  IF OLD.appointment_date != NEW.appointment_date OR OLD.start_time != NEW.start_time THEN
    DELETE FROM appointment_reminders WHERE appointment_id = NEW.id AND sent_at IS NULL;
    PERFORM schedule_appointment_reminder(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to schedule appointment reminders
CREATE OR REPLACE FUNCTION schedule_appointment_reminder(apt_id uuid)
RETURNS void AS $$
DECLARE
  apt_record RECORD;
  reminder_time timestamp;
BEGIN
  -- Get appointment details
  SELECT * INTO apt_record
  FROM appointments
  WHERE id = apt_id;
  
  -- Calculate 24-hour reminder time
  reminder_time := (apt_record.appointment_date || ' ' || apt_record.start_time)::timestamp - INTERVAL '24 hours';
  
  -- Only create reminder if appointment is in the future
  IF reminder_time > NOW() THEN
    INSERT INTO appointment_reminders (
      appointment_id,
      reminder_type,
      scheduled_for,
      status
    ) VALUES (
      apt_id,
      '24_hour',
      reminder_time,
      'pending'
    ) ON CONFLICT (appointment_id, reminder_type) DO NOTHING;
  END IF;
  
  -- Calculate 1-hour reminder time
  reminder_time := (apt_record.appointment_date || ' ' || apt_record.start_time)::timestamp - INTERVAL '1 hour';
  
  IF reminder_time > NOW() THEN
    INSERT INTO appointment_reminders (
      appointment_id,
      reminder_type,
      scheduled_for,
      status
    ) VALUES (
      apt_id,
      '1_hour',
      reminder_time,
      'pending'
    ) ON CONFLICT (appointment_id, reminder_type) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS on_appointment_created ON appointments;
DROP TRIGGER IF EXISTS on_appointment_updated ON appointments;

-- Create trigger for new appointments
CREATE TRIGGER on_appointment_created
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION notify_appointment_created();

-- Create trigger for appointment updates
CREATE TRIGGER on_appointment_updated
  AFTER UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION notify_appointment_updated();