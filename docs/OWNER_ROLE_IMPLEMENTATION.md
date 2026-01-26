# Owner Role Implementation in CRM System

## How the Owner Role Works

### 1. Automatic Assignment
- **Business Creation**: When a user creates a business account, they are automatically assigned the "owner" role
- **Profile Creation**: When a user profile is created, the system checks if they own any businesses
- **Role Logic**: If `businesses.owner_id = user.id`, then `profiles.role = 'owner'`

### 2. Owner Privileges
- **Full Access**: Owners have complete access to all business features and settings
- **Role Management**: Owners can assign roles to other users (admin, manager, staff, provider, customer)
- **Business Control**: Full control over business settings, billing, and configuration
- **Data Access**: Access to all business data, reports, and analytics

### 3. Security & Validation
- **Role Protection**: Owner role cannot be changed by non-owners
- **API Validation**: Backend validates that only actual business owners can be assigned owner role
- **Frontend Protection**: Owner role appears as read-only in the UI for owners
- **Database Constraint**: Owner role is protected at the database level

### 4. Role Hierarchy
```
Owner (👑) - Business creator, full control
├── Admin (🛡️) - Full administrative access
├── Manager (📋) - Team and operational management
├── Staff (👤) - Basic employee access
├── Provider (🔧) - Service provider access
└── Customer (👥) - Customer portal access
```

### 5. Implementation Details

#### Backend Logic
```sql
-- Check if user is a business owner
SELECT id FROM businesses WHERE owner_id = user_id;

-- Assign owner role during profile creation
INSERT INTO profiles (id, role, business_id, ...)
VALUES (user_id, 'owner', business_id, ...);
```

#### Frontend Behavior
- **Owner View**: Shows "👑 Owner - Business Owner (Cannot be changed)"
- **Non-Owner View**: Shows role dropdown without owner option
- **Role Selection**: Users can only select roles appropriate to their level

#### API Security
```javascript
// Validate owner role assignment
if (validatedData.role === 'owner') {
  const userBusiness = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', userId)
    .single();
  
  if (!userBusiness) {
    return NextResponse.json({ 
      error: 'Only business owners can be assigned the owner role' 
    }, { status: 403 });
  }
}
```

### 6. Database Schema
```sql
-- Businesses table
CREATE TABLE businesses (
  id uuid PRIMARY KEY,
  name varchar NOT NULL,
  owner_id uuid REFERENCES auth.users(id),
  -- ... other fields
);

-- Profiles table  
CREATE TABLE profiles (
  id uuid REFERENCES auth.users(id),
  role varchar CHECK (role IN ('owner', 'admin', 'manager', 'staff', 'provider', 'customer')),
  business_id uuid REFERENCES businesses(id),
  -- ... other fields
);
```

### 7. User Experience

#### For Business Owners:
- Automatically gets owner role when creating business
- Cannot change their own role (security feature)
- Can assign roles to other team members
- Sees special owner badge and privileges

#### For Other Users:
- Can be assigned roles by owners or admins
- Cannot assign owner role to themselves or others
- See appropriate role options based on their level

### 8. Migration Requirements

To implement this system:

1. **Update Database Constraint** (run `add_more_roles.sql`)
2. **Existing Users**: Run script to identify and assign owner roles to business creators
3. **New Users**: Automatic assignment during account creation

### 9. Benefits

- **Clear Ownership**: Always know who owns the business
- **Security**: Prevents unauthorized role escalation
- **Scalability**: Supports multiple business owners per account
- **Compliance**: Proper audit trail for business control

This implementation ensures that the person who creates the business account automatically becomes the owner, with proper security controls and user experience considerations.
