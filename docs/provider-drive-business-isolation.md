# Provider Drive Business Isolation

## Overview
The provider drive system is fully isolated by business, ensuring complete multi-tenant SaaS security. Each business's files are completely separated from other businesses.

## Isolation Layers

### 1. Database Level (RLS Policies)
**File:** `database/migrations/009_create_provider_drive_files.sql`

All RLS policies enforce business isolation:
- **SELECT**: Providers can only view files from their own business
- **INSERT**: Providers can only create files in their own business
- **UPDATE**: Providers can only update files from their own business
- **DELETE**: Providers can only delete files from their own business

**Key Constraint:**
```sql
WHERE id = provider_id 
AND business_id = provider_drive_files.business_id
```

### 2. Storage Level (Bucket Policies)
**File:** `database/migrations/create_provider_drive_storage_bucket.sql`

Storage paths follow the format: `{business_id}/{provider_id}/{timestamp}-{filename}`

Storage policies check both business_id and provider_id:
```sql
WHERE sp.id::text = (storage.foldername(name))[2]
AND sp.business_id::text = (storage.foldername(name))[1]
```

### 3. API Level (Application Logic)
**Files:** 
- `src/app/api/provider/drive/route.ts`
- `src/app/api/provider/drive/upload/route.ts`

All API routes enforce business isolation:

#### GET Route
- Filters by both `provider_id` AND `business_id`
- Only returns files from the provider's business

#### POST Route (Create Folder)
- Validates parent_id belongs to same business
- Validates parent_id belongs to same provider
- Sets `business_id` from provider record

#### DELETE Route
- Checks file belongs to provider's business before deletion
- Only checks children within same business
- Deletes with business_id filter

#### Upload Route
- Storage path includes business_id: `{business_id}/{provider_id}/...`
- Sets `business_id` from provider record

### 4. Database Constraints
**File:** `database/migrations/009_create_provider_drive_files.sql`

**Trigger Function:** `validate_parent_business()`
- Ensures parent folders belong to same business
- Ensures parent folders belong to same provider
- Prevents cross-business folder nesting

## Security Guarantees

1. **Complete Data Isolation**: Files from Business A cannot be accessed by Business B
2. **Provider Isolation**: Providers can only access their own files within their business
3. **Storage Isolation**: Storage paths are organized by business_id, preventing cross-business access
4. **Hierarchical Security**: Parent folders are validated to belong to same business/provider
5. **Multi-Layer Defense**: Even if one layer fails, others provide protection

## Testing Business Isolation

### Test Case 1: Cross-Business Access Prevention
1. Provider from Business A tries to access file from Business B
2. Expected: 404 or 403 error

### Test Case 2: Parent Folder Validation
1. Provider tries to create folder with parent_id from different business
2. Expected: Error "Cannot access folder from another business"

### Test Case 3: Storage Path Isolation
1. Files are stored with business_id in path
2. Storage policies prevent access to other business files
3. Expected: Cannot access files outside own business

### Test Case 4: RLS Policy Enforcement
1. Direct database query without proper business_id filter
2. Expected: RLS policies prevent access

## Migration Notes

When running migrations:
1. Run `009_create_provider_drive_files.sql` first
2. Run `create_provider_drive_storage_bucket.sql` second
3. Verify RLS policies are enabled: `SELECT * FROM pg_policies WHERE tablename = 'provider_drive_files';`
4. Verify storage policies exist: Check Supabase Storage policies

## Best Practices

1. **Always filter by business_id** in API routes
2. **Never trust client-provided business_id** - always get it from provider record
3. **Validate parent_id** belongs to same business before allowing operations
4. **Use RLS policies** as the primary security layer
5. **Storage paths** should always include business_id

## Related Files

- Database Schema: `database/migrations/009_create_provider_drive_files.sql`
- Storage Bucket: `database/migrations/create_provider_drive_storage_bucket.sql`
- API Routes: `src/app/api/provider/drive/route.ts`
- Upload Route: `src/app/api/provider/drive/upload/route.ts`
