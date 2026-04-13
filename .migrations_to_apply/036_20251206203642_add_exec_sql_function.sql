/*
  # Add SQL Execution Function

  ## Overview
  Creates a PostgreSQL function that allows executing dynamic SQL statements.
  This is used by the execute-ddl edge function to create custom tables.

  ## Security
  - Only accessible to authenticated users
  - Edge function verifies admin role before calling
  - Dangerous operations are blocked at the edge function level

  ## Function
  `exec_sql(sql_query text)` - Executes the provided SQL query
*/

-- Create function to execute dynamic SQL
CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql_query;
END;
$$;

-- Only allow authenticated users to call this function
REVOKE ALL ON FUNCTION exec_sql(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION exec_sql(text) TO authenticated;
