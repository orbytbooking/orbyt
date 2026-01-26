#!/bin/bash

echo "=== Setting up environment variables for provider creation ==="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo "✅ .env file created successfully!"
else
    echo "✅ .env file already exists."
fi

echo ""
echo "=== Checking environment variables ==="

# Check if SUPABASE_SERVICE_ROLE_KEY is set
if grep -q "^SUPABASE_SERVICE_ROLE_KEY=" .env; then
    SERVICE_KEY=$(grep "^SUPABASE_SERVICE_ROLE_KEY=" .env | cut -d'=' -f2)
    if [ -n "$SERVICE_KEY" ] && [ "$SERVICE_KEY" != "your-service-role-key" ]; then
        echo "✅ SUPABASE_SERVICE_ROLE_KEY is set"
        echo "   Key length: ${#SERVICE_KEY}"
    else
        echo "❌ SUPABASE_SERVICE_ROLE_KEY is not properly set"
        echo "   Please edit .env file and add your actual Supabase service role key"
    fi
else
    echo "❌ SUPABASE_SERVICE_ROLE_KEY line not found in .env"
fi

echo ""
echo "=== Next steps ==="
echo "1. If the service role key is not set:"
echo "   - Go to your Supabase project dashboard"
echo "   - Navigate to Settings > API"
echo "   - Copy the 'service_role' key"
echo "   - Edit your .env file and replace the placeholder"
echo ""
echo "2. Restart your development server:"
echo "   - Stop the current server (Ctrl+C)"
echo "   - Run: npm run dev"
echo ""
echo "3. Try adding a provider again"
