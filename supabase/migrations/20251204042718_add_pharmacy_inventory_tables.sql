/*
  # Advanced Inventory Management Tables

  ## New Tables
    - product_suppliers - Supplier information
    - insurance_formularies - Insurance coverage mapping
    - inventory_transactions - Stock movement tracking
    - product_images - Product photos
    - inventory_categories - Product categorization
  
  ## Enhancements
    - Add fields to pharmacy_inventory for NDC codes, therapeutic class, etc.
*/

CREATE TABLE IF NOT EXISTS product_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name text NOT NULL,
  contact_person text,
  email text,
  phone text,
  address_line1 text,
  city text,
  province text,
  postal_code text,
  ordering_lead_time_days integer DEFAULT 7,
  minimum_order_amount_cents integer,
  payment_terms text,
  is_preferred boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS insurance_formularies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insurance_provider text NOT NULL,
  insurance_plan_name text NOT NULL,
  din_number text NOT NULL,
  medication_name text NOT NULL,
  coverage_tier text CHECK (coverage_tier IN ('tier-1', 'tier-2', 'tier-3', 'tier-4', 'not-covered')),
  requires_prior_auth boolean DEFAULT false,
  quantity_limit integer,
  copay_amount_cents integer,
  coverage_percentage numeric(5,2),
  restrictions text,
  effective_date date,
  expiry_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name text UNIQUE NOT NULL,
  parent_category_id uuid REFERENCES inventory_categories(id),
  description text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid REFERENCES pharmacies(id) ON DELETE CASCADE,
  inventory_id uuid REFERENCES pharmacy_inventory(id),
  transaction_type text NOT NULL CHECK (transaction_type IN ('received', 'dispensed', 'adjusted', 'expired', 'returned', 'damaged', 'transferred')),
  quantity_change integer NOT NULL,
  quantity_before integer NOT NULL,
  quantity_after integer NOT NULL,
  unit_cost_cents integer,
  total_cost_cents integer,
  batch_number text,
  expiry_date date,
  supplier_id uuid REFERENCES product_suppliers(id),
  order_id uuid REFERENCES pharmacy_orders(id),
  staff_id uuid REFERENCES pharmacy_staff(id),
  notes text,
  transaction_date timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid REFERENCES pharmacy_inventory(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  image_type text CHECK (image_type IN ('product', 'packaging', 'label', 'other')),
  is_primary boolean DEFAULT false,
  display_order integer DEFAULT 0,
  uploaded_at timestamptz DEFAULT now()
);

-- Add columns to pharmacy_inventory
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pharmacy_inventory' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE pharmacy_inventory ADD COLUMN category_id uuid REFERENCES inventory_categories(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pharmacy_inventory' AND column_name = 'ndc_code'
  ) THEN
    ALTER TABLE pharmacy_inventory ADD COLUMN ndc_code text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pharmacy_inventory' AND column_name = 'therapeutic_class'
  ) THEN
    ALTER TABLE pharmacy_inventory ADD COLUMN therapeutic_class text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pharmacy_inventory' AND column_name = 'controlled_substance_schedule'
  ) THEN
    ALTER TABLE pharmacy_inventory ADD COLUMN controlled_substance_schedule text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pharmacy_inventory' AND column_name = 'expiry_date'
  ) THEN
    ALTER TABLE pharmacy_inventory ADD COLUMN expiry_date date;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pharmacy_inventory' AND column_name = 'batch_number'
  ) THEN
    ALTER TABLE pharmacy_inventory ADD COLUMN batch_number text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_pharmacy_id ON inventory_transactions(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_inventory_id ON inventory_transactions(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_date ON inventory_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_product_images_inventory_id ON product_images(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_categories_parent ON inventory_categories(parent_category_id);

-- Seed default categories
INSERT INTO inventory_categories (category_name, description, display_order) VALUES
  ('Prescription Medications', 'Medications requiring a prescription', 1),
  ('Over-the-Counter', 'OTC medications and remedies', 2),
  ('Vitamins & Supplements', 'Vitamins, minerals, and dietary supplements', 3),
  ('First Aid', 'First aid supplies and wound care', 4),
  ('Personal Care', 'Personal hygiene and care products', 5),
  ('Medical Devices', 'Medical equipment and devices', 6),
  ('Baby Care', 'Baby and infant care products', 7),
  ('Sexual Health', 'Sexual health and wellness products', 8)
ON CONFLICT (category_name) DO NOTHING;
