# Supabase Table Setup

To ensure the Flutter app can save data to Supabase, make sure you have the following table structure in your Supabase project:

## Sales Table

Create a table named `sales` with the following columns:

```sql
CREATE TABLE sales (
  id TEXT PRIMARY KEY,
  table_number INTEGER NOT NULL,
  table_name TEXT NOT NULL,
  items JSONB NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  local_date TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create an index for faster queries
CREATE INDEX idx_sales_timestamp ON sales(timestamp);
CREATE INDEX idx_sales_table_number ON sales(table_number);
```

## Keep Alive Table (optional)

If you want to use the keep-alive ping functionality:

```sql
CREATE TABLE keep_alive (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Enable Row Level Security (RLS)

For better security, enable RLS on your tables:

```sql
-- Enable RLS
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE keep_alive ENABLE ROW LEVEL SECURITY;

-- Create policies for anonymous access (adjust as needed)
CREATE POLICY "Enable insert for anonymous users" ON sales
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Enable read for anonymous users" ON sales
  FOR SELECT TO anon USING (true);

CREATE POLICY "Enable insert for anonymous users" ON keep_alive
  FOR INSERT TO anon WITH CHECK (true);
```

## Verify Setup

After creating the tables, verify everything is working by:

1. Running the Flutter app
2. Making a test sale
3. Checking the Supabase dashboard to see if the data appears in the `sales` table

The app will automatically sync sales when online, and queue them for later sync when offline.