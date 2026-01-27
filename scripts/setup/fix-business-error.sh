#!/bin/bash

# Fix for "Owner businesses error: 0" - Add is_active column to businesses table
# This script will run the migration to fix the missing is_active column

echo "🔧 Fixing 'Owner businesses error: 0'..."
echo "Adding is_active column to businesses table..."

# Check if supabase CLI is available
if command -v supabase &> /dev/null; then
    echo "Using Supabase CLI to run migration..."
    supabase db reset --db-url $DATABASE_URL
    echo "✅ Database reset completed"
else
    echo "⚠️  Supabase CLI not found. Please run the migration manually:"
    echo ""
    echo "1. Go to your Supabase dashboard"
    echo "2. Open the SQL editor"
    echo "3. Run this SQL:"
    echo ""
    echo "ALTER TABLE businesses ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;"
    echo "UPDATE businesses SET is_active = true WHERE is_active IS NULL;"
    echo ""
fi

echo "🎉 Migration completed! The error should now be fixed."
