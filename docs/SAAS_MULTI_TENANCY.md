# SaaS Multi-Tenancy Implementation Guide

This guide explains how user isolation works in your SaaS application to ensure each business can only access their own data.

## 🏗️ **Architecture Overview**

### **Database-Level Isolation**
- **Row Level Security (RLS)** policies enforce data isolation at the database level
- **Business-based filtering** ensures users only see their own records
- **Team member access** controlled through roles and permissions

### **Application-Level Isolation**
- **Business Context** - Every query is filtered by current business
- **Permission System** - Role-based access control (Owner, Admin, Member)
- **Audit Logging** - All actions are tracked for security

## 🔐 **How It Works**

### **1. User Authentication Flow**
```
User Login → Get User's Businesses → Set Current Business → Filter All Data
```

### **2. Data Isolation Layers**

#### **Database Layer (Most Secure)**
```sql
-- RLS Policy Example
CREATE POLICY "Users can view own business bookings" ON bookings 
FOR SELECT USING (
    business_id IN (
        SELECT id FROM businesses 
        WHERE owner_id = auth.uid() 
        OR id IN (SELECT business_id FROM tenant_users WHERE user_id = auth.uid())
    )
);
```

#### **Application Layer (Convenience)**
```typescript
// Auto-filtered queries
const tenantQueries = useTenantQueries(currentBusiness.id);
const { data: bookings } = await tenantQueries.bookings.select('*');
```

### **3. Business Hierarchy**
```
Business (Owner)
├── Admin (Full access)
├── Member (Limited access)
└── Member (Limited access)
```

## 📊 **Data Model**

### **Business Isolation**
- Each business has a unique `tenant_id`
- All data records reference `business_id`
- Users can only access businesses they own or are invited to

### **Team Management**
- `tenant_users` table manages team invitations
- Role-based permissions (owner, admin, member)
- Granular permissions stored in JSONB

### **Security Features**
- **Audit Logs** - Track all data changes
- **Session Management** - Secure user sessions
- **API Rate Limiting** - Prevent abuse

## 🚀 **Implementation Steps**

### **Step 1: Database Setup**
```bash
# Run the multi-tenant schema
psql -f database/multi-tenant-schema.sql
```

### **Step 2: Frontend Integration**
```typescript
// Wrap your app with BusinessProvider
<BusinessProvider>
  <App />
</BusinessProvider>

// Use business context in components
const { currentBusiness, hasPermission } = useBusiness();

// Filter queries by business
const tenantQueries = useTenantQueries(currentBusiness.id);
```

### **Step 3: API Protection**
```typescript
// Middleware to add business context
export async function middleware(req: NextRequest) {
  const session = await getSession(req);
  const businessId = req.headers.get('x-business-id');
  
  // Validate user has access to this business
  const hasAccess = await validateBusinessAccess(session.user.id, businessId);
  
  if (!hasAccess) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
}
```

## 🛡️ **Security Measures**

### **1. Database Security**
- ✅ **RLS Policies** - Enforce data access rules
- ✅ **Foreign Keys** - Prevent orphaned records
- ✅ **Audit Triggers** - Log all data changes

### **2. Application Security**
- ✅ **Session Validation** - Verify user authentication
- ✅ **Business Context** - Filter all queries
- ✅ **Permission Checks** - Role-based access control

### **3. API Security**
- ✅ **Request Validation** - Validate business access
- ✅ **Rate Limiting** - Prevent API abuse
- ✅ **CORS Configuration** - Control cross-origin requests

## 📋 **Testing Isolation**

### **Test Scenarios**
1. **User A cannot see User B's bookings**
2. **Team member cannot access admin functions**
3. **Invited user only sees invited business**
4. **Audit logs track all changes**

### **Testing Commands**
```sql
-- Test User A's data
SET auth.uid = 'user-a-id';
SELECT * FROM bookings; -- Should only show User A's bookings

-- Test User B's data  
SET auth.uid = 'user-b-id';
SELECT * FROM bookings; -- Should only show User B's bookings
```

## 🔧 **Usage Examples**

### **Creating a Booking**
```typescript
// Automatically filtered by current business
const { data, error } = await tenantQueries.bookings.insert({
  customer_name: 'John Doe',
  service: 'Carpet Cleaning',
  date: '2024-01-15'
  // business_id is automatically added
});
```

### **Reading Bookings**
```typescript
// Only returns bookings for current business
const { data: bookings } = await tenantQueries.bookings.select('*');
```

### **Team Management**
```typescript
// Invite team member
const { error } = await supabase
  .from('tenant_users')
  .insert({
    business_id: currentBusiness.id,
    user_id: 'new-user-id',
    role: 'member'
  });
```

## 🚨 **Important Notes**

### **Security First**
- Always validate business access at the database level
- Never trust frontend data filtering alone
- Implement proper session management

### **Performance**
- Add database indexes on `business_id` columns
- Use connection pooling for high traffic
- Cache frequently accessed business data

### **Scalability**
- Design for horizontal scaling
- Implement proper backup strategies
- Monitor database performance

## 📞 **Support**

For questions about multi-tenancy implementation:
1. Check the database schema in `database/multi-tenant-schema.sql`
2. Review the BusinessContext in `src/contexts/BusinessContext.tsx`
3. Test with the multi-tenant queries in `src/lib/multiTenantSupabase.ts`

---

**Remember**: In a SaaS application, data isolation is critical. Always implement security at multiple layers (database, application, and API) to ensure complete user data protection.
