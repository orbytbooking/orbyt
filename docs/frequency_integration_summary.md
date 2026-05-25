# Frequency Integration Summary

## Database Schema Alignment

The `industry_frequency` table has been updated to match your provided schema with the following key features:

### Core Fields
- `id` (UUID, primary key)
- `business_id` (foreign key to businesses)
- `industry_id` (foreign key to industries)
- `name`, `description`
- `different_on_customer_end`, `show_explanation`, `enable_popup`
- `display` (Both/Booking/Quote)
- `occurrence_time` (onetime/recurring)
- `discount`, `discount_type` (%/$)
- `is_default`
- `excluded_providers` (text array)

### Dependencies Fields
- `add_to_other_industries`, `enabled_industries`
- `show_based_on_location`, `location_ids`
- `service_categories`
- `bathroom_variables`, `sqft_variables`, `bedroom_variables`
- `exclude_parameters`, `extras`

### Recurring Frequency Fields (Added)
- `frequency_repeats` (daily, weekly, monthly, etc.)
- `shorter_job_length` (yes/no)
- `shorter_job_length_by` (percentage)
- `exclude_first_appointment` (boolean)
- `frequency_discount` (all/exclude-first)
- `charge_one_time_price` (boolean)

## API Integration

### `/api/industry-frequency` Route
- **GET**: Fetch frequencies by industryId or businessId
- **POST**: Create new frequency with all fields
- **PUT**: Update existing frequency
- **DELETE**: Soft delete (set is_active=false) or permanent delete

### Frontend Connection
- **List Page**: `/admin/settings/industries/form-1/frequencies`
- **Add/Edit Page**: `/admin/settings/industries/form-1/frequencies/new`
- **Form Integration**: Connected to industries, providers, service categories, extras, locations, and pricing parameters

## Key Features Implemented

1. **Frequency Management**: Full CRUD operations for frequencies
2. **Recurring Options**: Advanced recurring frequency configuration
3. **Dependencies**: Complex conditional logic based on location, service categories, etc.
4. **Provider Exclusions**: Exclude specific providers from frequency options
5. **Display Controls**: Show frequencies on booking, quote, or both
6. **Discount System**: Percentage or fixed amount discounts
7. **Default Selection**: Mark frequencies as default options

## Database Migration

Run the following SQL files in order:
1. `create_industry_frequency_table.sql` - Main table creation
2. `add_recurring_frequency_columns.sql` - Add recurring frequency fields

## Frontend Features

### Frequency List Page
- View all frequencies for an industry
- Edit, delete, and reorder frequencies
- Toggle default frequency status
- Display discount information

### Frequency Form Page
- Comprehensive frequency configuration
- Tabbed interface (Details, Dependencies, Providers)
- Real-time validation
- Dynamic field visibility based on occurrence time
- Integration with all dependency systems

## Security

- Row Level Security (RLS) enabled
- Business-based data isolation
- User authentication required
- Proper foreign key constraints

## Next Steps

1. Run the database migrations
2. Test the frequency creation and management
3. Verify integration with booking system
4. Test recurring frequency logic
5. Validate dependency conditions
