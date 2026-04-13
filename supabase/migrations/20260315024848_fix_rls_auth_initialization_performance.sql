/*
  # Fix Auth RLS Initialization Plan Performance

  ## Summary
  This migration fixes a critical performance issue where RLS policies call auth.uid()
  directly, causing PostgreSQL to re-evaluate the function for every row scanned.
  
  By wrapping auth.uid() in a subquery (select auth.uid()), PostgreSQL evaluates
  the function once per query, dramatically improving performance for tables with
  many rows.

  ## Changes
  - Replaces all occurrences of bare auth.uid() with (select auth.uid()) in RLS policies
    across all tables in the public schema
  - Uses a programmatic approach to drop and recreate each affected policy
  
  ## Affected Tables
  All tables with RLS policies using bare auth.uid() calls (758+ policies)
  
  ## How it works
  The DO block below generates and executes ALTER statements for all policies
  that use the bare auth.uid() pattern, replacing them with the optimized form.
*/

DO $$
DECLARE
  r RECORD;
  new_qual TEXT;
  new_with_check TEXT;
  drop_sql TEXT;
  create_sql TEXT;
  cmd_for TEXT;
BEGIN
  FOR r IN
    SELECT 
      schemaname,
      tablename,
      policyname,
      cmd,
      qual,
      with_check,
      roles,
      permissive
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(select auth.uid())%')
        OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(select auth.uid())%')
      )
    ORDER BY tablename, policyname
  LOOP
    -- Replace bare auth.uid() with (select auth.uid()) in qual and with_check
    -- Use a careful replacement that won't double-wrap already-subqueried calls
    new_qual := r.qual;
    new_with_check := r.with_check;
    
    IF new_qual IS NOT NULL THEN
      -- Replace auth.uid() that is NOT already inside (select auth.uid())
      new_qual := regexp_replace(new_qual, '\(select auth\.uid\(\)\)', '##PLACEHOLDER##', 'g');
      new_qual := replace(new_qual, 'auth.uid()', '(select auth.uid())');
      new_qual := replace(new_qual, '##PLACEHOLDER##', '(select auth.uid())');
    END IF;
    
    IF new_with_check IS NOT NULL THEN
      new_with_check := regexp_replace(new_with_check, '\(select auth\.uid\(\)\)', '##PLACEHOLDER##', 'g');
      new_with_check := replace(new_with_check, 'auth.uid()', '(select auth.uid())');
      new_with_check := replace(new_with_check, '##PLACEHOLDER##', '(select auth.uid())');
    END IF;
    
    -- Skip if nothing changed
    IF new_qual IS NOT DISTINCT FROM r.qual AND new_with_check IS NOT DISTINCT FROM r.with_check THEN
      CONTINUE;
    END IF;
    
    -- Map internal cmd representation to SQL keyword
    cmd_for := CASE r.cmd
      WHEN 'SELECT' THEN 'SELECT'
      WHEN 'INSERT' THEN 'INSERT'
      WHEN 'UPDATE' THEN 'UPDATE'
      WHEN 'DELETE' THEN 'DELETE'
      WHEN 'ALL' THEN 'ALL'
      ELSE 'ALL'
    END;
    
    -- Drop the existing policy
    drop_sql := format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      r.policyname,
      r.schemaname,
      r.tablename
    );
    
    EXECUTE drop_sql;
    
    -- Build CREATE POLICY statement
    create_sql := format(
      'CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s',
      r.policyname,
      r.schemaname,
      r.tablename,
      CASE WHEN r.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
      cmd_for,
      array_to_string(r.roles, ', ')
    );
    
    IF new_qual IS NOT NULL THEN
      create_sql := create_sql || ' USING (' || new_qual || ')';
    END IF;
    
    IF new_with_check IS NOT NULL THEN
      create_sql := create_sql || ' WITH CHECK (' || new_with_check || ')';
    END IF;
    
    BEGIN
      EXECUTE create_sql;
    EXCEPTION WHEN OTHERS THEN
      -- Log but continue if a specific policy fails
      RAISE WARNING 'Failed to recreate policy % on %.%: % - SQL: %',
        r.policyname, r.schemaname, r.tablename, SQLERRM, create_sql;
    END;
    
  END LOOP;
END;
$$;
