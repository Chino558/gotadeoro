# Debugging Supabase Connection Issues

## How to Enable Debug Mode

1. Open the Flutter app
2. Tap on "La Gota de Oro" title 5 times quickly
3. You'll see a message "Debug mode enabled"
4. A red bug icon will appear in the header
5. Tap the bug icon to open the debug screen

## Debug Screen Features

### 1. Test Supabase Connection
- Checks if Supabase client is initialized
- Verifies connection status
- Checks if anonymous session exists
- Tests direct table access

### 2. Test Simple Insert
- Attempts to insert a test record directly to Supabase
- Shows any errors that occur

### 3. Check Pending Syncs
- Shows count of local sales
- Lists any sales waiting to sync
- Shows unsynced sales details

## Common Issues and Solutions

### Issue: "Cannot access sales table"
**Possible causes:**
1. Table doesn't exist in Supabase
2. Row Level Security (RLS) is blocking access
3. Anonymous access is not enabled

**Solution:**
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Run the SQL commands from `supabase_setup.sql`

### Issue: Sales save locally but don't sync
**Check:**
1. Network connectivity
2. Supabase session exists
3. Table permissions

### Issue: "Insert failed" errors
**Common errors:**
- `relation "public.sales" does not exist` - Table needs to be created
- `permission denied` - RLS policies need to be updated
- `invalid input syntax` - Data format issue

## Quick SQL to Run in Supabase

```sql
-- Check if sales table exists
SELECT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'sales'
);

-- View recent sales (if any)
SELECT * FROM sales 
ORDER BY created_at DESC 
LIMIT 10;

-- Check RLS policies
SELECT * FROM pg_policies 
WHERE tablename = 'sales';
```

## Still Having Issues?

1. Check the Supabase dashboard logs
2. Verify your project is active (not paused)
3. Ensure anonymous sign-ins are enabled in Authentication settings
4. Check if your API keys match (though they're already hardcoded)