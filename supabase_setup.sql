-- First, check if the sales table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'sales'
);

-- If the table doesn't exist, create it:
CREATE TABLE IF NOT EXISTS public.sales (
    id TEXT PRIMARY KEY,
    table_number INTEGER NOT NULL,
    table_name TEXT NOT NULL,
    items JSONB NOT NULL,
    total NUMERIC(10,2) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    local_date TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sales_timestamp ON public.sales(timestamp);
CREATE INDEX IF NOT EXISTS idx_sales_table_number ON public.sales(table_number);

-- Enable Row Level Security
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Enable insert for anon users" ON public.sales;
DROP POLICY IF EXISTS "Enable read for anon users" ON public.sales;
DROP POLICY IF EXISTS "Enable update for anon users" ON public.sales;
DROP POLICY IF EXISTS "Enable delete for anon users" ON public.sales;
DROP POLICY IF EXISTS "Enable all operations for public" ON public.sales;

-- Create a permissive policy for ALL operations without authentication
-- WARNING: This is for testing/internal use only!
CREATE POLICY "Enable all operations for public" ON public.sales
    FOR ALL 
    USING (true)
    WITH CHECK (true);

-- Alternative: If you want to be more specific
-- CREATE POLICY "Enable insert for public" ON public.sales
--     FOR INSERT 
--     WITH CHECK (true);
-- 
-- CREATE POLICY "Enable read for public" ON public.sales
--     FOR SELECT 
--     USING (true);

-- Also create the keep_alive table if you want to use it
CREATE TABLE IF NOT EXISTS public.keep_alive (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on keep_alive
ALTER TABLE public.keep_alive ENABLE ROW LEVEL SECURITY;

-- Create policy for keep_alive
DROP POLICY IF EXISTS "Enable insert for anon users" ON public.keep_alive;
CREATE POLICY "Enable insert for anon users" ON public.keep_alive
    FOR INSERT TO anon
    WITH CHECK (true);

-- Verify the tables exist
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('sales', 'keep_alive');