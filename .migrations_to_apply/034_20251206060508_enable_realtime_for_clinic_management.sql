/*
  # Enable Real-time Synchronization for Clinic Management

  This migration enables Supabase Realtime for the following tables:
  - procedures_master
  - products_master
  - specialties_master
  - pharmacy_inventory

  This allows all connected clients to receive live updates when data changes,
  ensuring real-time synchronization across all portals (admin, provider, pharmacy).

  ## What This Enables:
  1. **Procedures Management**: Admins adding/editing procedures will instantly reflect across all sessions
  2. **Product Catalog**: Product updates in admin portal immediately sync to pharmacy inventories
  3. **Specialties**: Changes to specialties instantly update in provider profiles and search
  4. **Pharmacy Inventory**: Stock updates sync in real-time for better inventory management

  ## Security:
  - Realtime only broadcasts changes; RLS policies still control who can read/write data
  - All existing security policies remain in effect
*/

-- Enable Realtime for procedures_master table
ALTER PUBLICATION supabase_realtime ADD TABLE procedures_master;

-- Enable Realtime for products_master table
ALTER PUBLICATION supabase_realtime ADD TABLE products_master;

-- Enable Realtime for specialties_master table
ALTER PUBLICATION supabase_realtime ADD TABLE specialties_master;

-- Enable Realtime for pharmacy_inventory table
ALTER PUBLICATION supabase_realtime ADD TABLE pharmacy_inventory;

-- Add comment to track realtime enablement
COMMENT ON TABLE procedures_master IS 'Medical procedures catalog with real-time sync enabled';
COMMENT ON TABLE products_master IS 'Master product catalog for pharmacies with real-time sync enabled';
COMMENT ON TABLE specialties_master IS 'Medical specialties with real-time sync enabled';
COMMENT ON TABLE pharmacy_inventory IS 'Pharmacy inventory with real-time sync enabled';
