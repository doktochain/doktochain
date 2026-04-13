/*
  # Add Products Catalog Table

  1. New Tables
    - `products_master` - Master catalog of medications/products for pharmacies
    
  2. Purpose
    - Centralized product catalog that pharmacies reference
    - Pharmacies add products to their inventory from this master list
    - Includes pricing guidance and stock information
    
  3. Security
    - Enable RLS on all tables
    - Public read access for active products
    - Admin can manage products
*/

-- Products Master Catalog Table
CREATE TABLE IF NOT EXISTS products_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Product identification
  product_name text NOT NULL,
  generic_name text,
  brand_name text,
  din_number text UNIQUE,
  ndc_code text,
  upc_code text,
  
  -- Product details
  description text,
  category text NOT NULL,
  subcategory text,
  dosage_form text,
  strength text,
  unit_size text,
  
  -- Classification
  drug_class text,
  therapeutic_category text,
  requires_prescription boolean DEFAULT true,
  is_controlled_substance boolean DEFAULT false,
  controlled_schedule text,
  
  -- Pricing guidance
  suggested_retail_price_cents integer,
  wholesale_price_cents integer,
  manufacturer_price_cents integer,
  
  -- Product information
  manufacturer text,
  active_ingredients text[],
  inactive_ingredients text[],
  warnings text[],
  side_effects text[],
  storage_instructions text,
  
  -- Inventory defaults
  reorder_level integer DEFAULT 10,
  reorder_quantity integer DEFAULT 50,
  
  -- Status
  is_active boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  
  -- Search and SEO
  search_keywords text[],
  tags text[],
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_din ON products_master(din_number);
CREATE INDEX IF NOT EXISTS idx_products_category ON products_master(category);
CREATE INDEX IF NOT EXISTS idx_products_active ON products_master(is_active);
CREATE INDEX IF NOT EXISTS idx_products_prescription ON products_master(requires_prescription);
CREATE INDEX IF NOT EXISTS idx_products_name ON products_master(product_name);

-- Enable RLS
ALTER TABLE products_master ENABLE ROW LEVEL SECURITY;

-- Public read access for active products
CREATE POLICY "Anyone can view active products"
  ON products_master FOR SELECT
  TO anon, authenticated
  USING (is_active = true AND deleted_at IS NULL);

-- Admin can manage products
CREATE POLICY "Admins can manage products"
  ON products_master FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
      AND user_roles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
      AND user_roles.is_active = true
    )
  );
