# Service Category Database Setup

## Overview
This document describes the database setup for the `industry_service_category` table, which stores service categories with all their configuration options.

## Database Schema

### Table Name
`industry_service_category`

### Schema File Location
- Main schema: `database/industry_service_category_schema.sql`
- Migration: `database/migrations/create_industry_service_category.sql`

### Key Features
- **Multi-tenant support**: Each category is tied to a `business_id` and `industry_id`
- **JSONB fields**: Complex configuration stored as JSONB for flexibility
- **Row Level Security (RLS)**: Automatic data isolation per business
- **Automatic timestamps**: `created_at` and `updated_at` with triggers

## Running the Migration

### Option 1: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `database/migrations/create_industry_service_category.sql`
4. Run the SQL script

### Option 2: Using Supabase CLI
```bash
supabase db push
```

### Option 3: Manual SQL Execution
Connect to your PostgreSQL database and run:
```bash
psql -h your-host -U your-user -d your-database -f database/migrations/create_industry_service_category.sql
```

## Service Layer

### Location
`src/lib/serviceCategories.ts`

### Available Methods

#### Read Operations
- `getServiceCategoriesByIndustry(industryId: string)` - Get all categories for an industry
- `getServiceCategoryById(id: string)` - Get a specific category by ID

#### Write Operations
- `createServiceCategory(categoryData)` - Create a new service category
- `updateServiceCategory(id, updateData)` - Update an existing category
- `deleteServiceCategory(id)` - Delete a category
- `updateServiceCategoryOrder(updates)` - Batch update sort order

#### Migration Helper
- `migrateFromLocalStorage(industryId, industryName)` - Migrate data from localStorage to database

## Usage in Components

### Import
```typescript
import { serviceCategoriesService, ServiceCategory } from '@/lib/serviceCategories';
```

### Example: Fetch Categories
```typescript
const categories = await serviceCategoriesService.getServiceCategoriesByIndustry('cleaning');
```

### Example: Create Category
```typescript
const newCategory = await serviceCategoriesService.createServiceCategory({
  business_id: businessId,
  industry_id: 'cleaning',
  name: 'Kitchen Cleaning',
  description: 'Deep cleaning for kitchens',
  display: 'customer_frontend_backend_admin',
  // ... other fields
});
```

## Updated Components

The following components have been updated to use the database:

1. **List Page**: `src/app/admin/settings/industries/form-1/service-category/page.tsx`
   - Loads categories from database
   - Deletes categories from database
   - Updates sort order in database

2. **Form Page**: `src/app/admin/settings/industries/form-1/service-category/new/page.tsx`
   - Creates new categories in database
   - Updates existing categories in database
   - Loads category data for editing

## Data Migration

If you have existing service categories in localStorage, you can migrate them using:

```typescript
await serviceCategoriesService.migrateFromLocalStorage(industryId, industryName);
```

This will:
1. Read categories from localStorage
2. Convert to database format
3. Insert into the database
4. Clear localStorage after successful migration

## Database Fields

### Basic Information
- `id` - UUID primary key
- `business_id` - Foreign key to businesses table
- `industry_id` - Text identifier for the industry
- `name` - Category name (required)
- `description` - Optional description

### Display Settings
- `display` - Where category shows up (frontend/backend/admin)
- `display_service_length_customer` - Show service length to customer
- `display_service_length_provider` - Show service length to provider
- `can_customer_edit_service` - Allow customer edits
- `service_fee_enabled` - Enable service fee

### Frequency Settings
- `service_category_frequency` - Enable frequency-based display
- `selected_frequencies` - Array of frequency options

### Configuration (JSONB)
- `variables` - Custom variables
- `exclude_parameters` - Parameters to exclude
- `extras_config` - Tip and parking configuration
- `expedited_charge` - Same-day charge settings
- `cancellation_fee` - Cancellation fee configuration
- `hourly_service` - Hourly service pricing
- `service_category_price` - Fixed category price
- `service_category_time` - Fixed category time
- `minimum_price` - Minimum price settings
- `override_provider_pay` - Provider payment override

### Metadata
- `excluded_providers` - Array of provider IDs to exclude
- `sort_order` - Display order
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

## Security

Row Level Security (RLS) policies ensure:
- Users can only view categories for their own business
- Users can only create/update/delete categories for their own business
- All operations are automatically filtered by `business_id`

## Indexes

The following indexes are created for performance:
- `idx_industry_service_category_business_id` - Fast lookup by business
- `idx_industry_service_category_industry_id` - Fast lookup by industry
- `idx_industry_service_category_sort_order` - Fast sorting

## Notes

- All JSONB fields have default values to prevent null issues
- The `updated_at` field is automatically updated via trigger
- Sort order starts at 0 and increments
- UUIDs are automatically generated for new records
