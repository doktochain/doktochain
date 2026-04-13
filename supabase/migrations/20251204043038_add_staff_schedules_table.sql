/*
  # Staff Schedules Table
*/

CREATE TABLE IF NOT EXISTS staff_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES pharmacy_staff(id) ON DELETE CASCADE,
  schedule_date date NOT NULL,
  shift_start_time time NOT NULL,
  shift_end_time time NOT NULL,
  break_start_time time,
  break_duration_minutes integer DEFAULT 30,
  schedule_status text DEFAULT 'scheduled' CHECK (schedule_status IN ('scheduled', 'confirmed', 'completed', 'absent', 'cancelled')),
  notes text,
  created_by uuid REFERENCES pharmacy_staff(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(staff_id, schedule_date, shift_start_time)
);

CREATE INDEX IF NOT EXISTS idx_staff_schedules_staff_id ON staff_schedules(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_date ON staff_schedules(schedule_date);
