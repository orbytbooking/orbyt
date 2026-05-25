@echo off
echo Setting up environment variables for provider creation...
echo.

echo Checking if .env file exists...
if not exist .env (
    echo Creating .env file from .env.example...
    copy .env.example .env
    echo .env file created successfully!
) else (
    echo .env file already exists.
)

echo.
echo IMPORTANT: Please ensure your .env file contains the SUPABASE_SERVICE_ROLE_KEY
echo The line should look like this:
echo SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
echo.

echo Checking current .env file content...
type .env | findstr SUPABASE_SERVICE_ROLE_KEY

echo.
echo If the SUPABASE_SERVICE_ROLE_KEY line above is empty or missing:
echo 1. Open your .env file
echo 2. Copy the service role key from your Supabase project settings
echo 3. Add it to the .env file like: SUPABASE_SERVICE_ROLE_KEY=your_key_here
echo 4. Restart your development server
echo.

pause
