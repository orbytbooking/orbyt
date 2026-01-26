@echo off
REM Fix for "Owner businesses error: 0" - Add is_active column to businesses table
REM This script will help you run the migration to fix the missing is_active column

echo 🔧 Fixing 'Owner businesses error: 0'...
echo Adding is_active column to businesses table...

echo.
echo ⚠️  Please run this SQL manually in your Supabase dashboard:
echo.
echo 1. Go to your Supabase dashboard
echo 2. Open the SQL editor
echo 3. Run this SQL:
echo.
echo ALTER TABLE businesses ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
echo UPDATE businesses SET is_active = true WHERE is_active IS NULL;
echo.
echo 🎉 After running the SQL, the error should be fixed!
echo.
pause
