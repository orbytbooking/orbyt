# Scripts Directory

This directory contains utility scripts organized by category for development, testing, and maintenance.

## 📁 Folder Structure

### 🗄️ Database Scripts (`database/`)
Database utilities and maintenance:
- `check-business-logo-setup.sql` - Verify business logo configuration
- `check-businesses-image-columns.sql` - Check image column structure
- `check-logo-status.sql` - Check logo status in database
- `check-logo-urls.sql` - Verify logo URL configurations
- `check-profiles-table.sql` - Check profiles table structure
- `cleanup-blob-urls.sql` - Clean up blob URLs
- `remove_users.sql` - Remove user data utilities
- `run-all-tests.sql` - Run all database tests

### 🧪 Test Scripts (`test/`)
Testing utilities and validation:
- `frontend-test-ready.js` - Frontend testing preparation
- `run-all-frontend-tests.js` - Run all frontend tests
- `quick-test.js` - Quick validation tests
- `test-auth-fix.js` - Authentication testing
- `test-env.js` - Environment variable testing
- `test-image-config.js` - Image configuration testing
- `test-image-flow.js` - Image upload flow testing
- `test-image-loading.js` - Image loading tests
- `test-logo-upload.js` - Logo upload testing
- `test-new-upload.js` - New upload functionality testing
- `test-profile-upload.js` - Profile upload testing
- `test-purchase.js` - Purchase flow testing
- `test-save-display.js` - Save and display testing
- `test-supabase-storage.js` - Supabase storage testing
- `test-upload-terminal.js` - Upload terminal testing
- `test-provider-invitation.sh` - Provider invitation testing
- `test-auth.html` - Authentication testing HTML
- `test-provider-invitation.sh` - Provider invitation script

### ⚙️ Setup Scripts (`setup/`)
Environment and configuration setup:
- `setup-env.sh` - Environment setup script
- `setup-provider-env.bat` - Provider environment setup (Windows)
- `fix-business-error.bat` - Business error fix (Windows)
- `fix-business-error.sh` - Business error fix (Unix)
- `add-resend-key.txt` - Resend API key addition

### 🔍 Debug Scripts (`debug/`)
Debugging and diagnostic utilities:
- `debug-logo-display.js` - Logo display debugging
- `debug-upload.js` - Upload functionality debugging
- `cleanup-blob-urls.js` - Blob URL cleanup
- `cleanup-localstorage.js` - Local storage cleanup
- `check-profile-picture.js` - Profile picture verification
- `verify-bucket-url.js` - Bucket URL verification

## 🚀 Usage

### Running Scripts

#### JavaScript/Node.js Scripts
```bash
# From project root
node scripts/test/test-env.js
node scripts/debug/debug-logo-display.js
node scripts/setup/setup-env.sh
```

#### SQL Scripts
```bash
# Using psql
psql -h your-host -U your-user -d your-db < scripts/database/check-logo-status.sql

# Or run in Supabase SQL editor
# Copy and paste the SQL content
```

#### Shell Scripts
```bash
# Unix/Linux/MacOS
chmod +x scripts/setup/setup-env.sh
./scripts/setup/setup-env.sh

# Windows
scripts/setup/setup-provider-env.bat
```

### Script Categories

#### Development Setup
1. Use `setup/` scripts for initial environment configuration
2. Run `test/test-env.js` to verify setup
3. Check `database/` scripts for database verification

#### Testing
1. Run `test/quick-test.js` for basic validation
2. Use `test/run-all-frontend-tests.js` for comprehensive testing
3. Individual test scripts for specific functionality

#### Debugging
1. Use `debug/` scripts for troubleshooting
2. Run `database/check-*.sql` for database issues
3. Use `cleanup-*.js` scripts for data cleanup

#### Maintenance
1. Run `database/cleanup-*.sql` for database maintenance
2. Use `debug/cleanup-*.js` for client-side cleanup
3. Check `database/run-all-tests.sql` for health checks

## 📋 Script Standards

All scripts follow these conventions:
- Clear file names indicating purpose
- Comments explaining functionality
- Error handling and logging
- Cross-platform compatibility where possible

## 🔧 Customization

### Environment Variables
Most scripts use environment variables from `.env.local`. Ensure these are properly configured before running scripts.

### Database Connection
SQL scripts assume Supabase connection. Update connection details if using a different database.

### File Paths
Scripts use relative paths from project root. Update if moving scripts to different locations.

## 🚨 Important Notes

- **Backup First**: Always backup data before running cleanup scripts
- **Test Environment**: Run scripts in test environment before production
- **Permissions**: Ensure proper file permissions for shell scripts
- **Dependencies**: Some scripts require Node.js, psql, or other tools

## 📞 Support

For script-related issues:
1. Check the script comments for usage instructions
2. Review troubleshooting documentation in `docs/troubleshooting/`
3. Check error logs for specific issues
4. Contact development team for persistent problems
