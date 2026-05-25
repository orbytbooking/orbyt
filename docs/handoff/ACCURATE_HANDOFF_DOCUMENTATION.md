# Orbyt - Accurate Project Handoff Documentation

## Executive Summary

Orbyt is a multi-tenant SaaS platform for service-based businesses, built with Next.js 16, React 19, TypeScript, and Supabase. **This documentation reflects the actual implemented codebase, not planned features.**

**Current Status**: Core multi-tenant infrastructure is solid. Some modules are complete (providers, gift cards, locations) while others have frontend only (marketing coupons) or are incomplete (cleaning industry module).

---

## 1. Source Code Repository Structure (Verified)

### Frontend Architecture
```
src/
├── app/                    # Next.js App Router pages
│   ├── admin/             # Business owner dashboard
│   │   ├── marketing/     # Marketing tools (frontend only)
│   │   ├── providers/     # Provider management (complete)
│   │   └── profile/       # Business profile management
│   ├── api/               # API routes (backend)
│   │   ├── admin/         # Admin APIs (providers, business, etc.)
│   │   ├── marketing/     # Gift cards APIs only
│   │   ├── locations/     # Location management APIs
│   │   ├── bookings/      # Basic booking APIs
│   │   └── cleaning/      # EMPTY directories (not implemented)
│   ├── auth/              # Authentication pages
│   ├── customer/          # Customer-facing pages
│   └── provider/          # Service provider dashboard
├── components/            # Reusable React components
│   ├── admin/            # Admin-specific components
│   ├── cleaning/         # Home cleaning components (frontend only)
│   └── ui/               # Base UI components (shadcn/ui)
├── contexts/              # React contexts (Business, Logo)
├── lib/                   # Utility libraries
└── middleware.ts         # Next.js middleware for auth
```

### Backend Architecture (Verified APIs)
```
src/app/api/
├── admin/
│   ├── providers/[id]/    # ✅ Complete provider management
│   ├── providers/         # ✅ Provider CRUD operations
│   ├── business/          # ✅ Business management
│   └── profile/           # ✅ Profile management
├── marketing/
│   └── gift-cards/        # ✅ Complete gift card system
│       ├── instances/     # Gift card instances
│       ├── redeem/        # Gift card redemption
│       └── transactions/  # Transaction tracking
├── locations/             # ✅ Complete location management
│   ├── map/              # Map integration
│   └── zip-codes/        # Zip code management
├── bookings/             # ✅ Basic booking system
├── leads/                # ✅ Lead management
└── test/                 # Various test endpoints
```

### Missing APIs (Directories exist but empty)
```
src/app/api/cleaning/     # ❌ Empty (services, availability, etc.)
src/app/api/marketing/coupons/  # ❌ Not implemented (frontend only)
```

---

## 2. Database Schema (Verified from full_schema.sql)

### Core Tables (Verified)

#### businesses ✅
- **Purpose**: Multi-tenant business isolation
- **Key Fields**: id, name, owner_id, subdomain, domain, plan, is_active
- **Relationships**: owner_id → auth.users

#### profiles ✅
- **Purpose**: User role management and business association
- **Key Fields**: id, full_name, phone, role, business_id, is_active
- **Roles**: customer, provider, admin
- **Relationships**: id → auth.users, business_id → businesses

#### customers ✅
- **Purpose**: Customer management with analytics
- **Key Fields**: id, email, name, phone, business_id, total_bookings, total_spent
- **Relationships**: business_id → businesses, auth_user_id → auth.users

#### service_providers ✅
- **Purpose**: Service provider/staff management
- **Key Fields**: id, user_id, business_id, first_name, last_name, email, specialization
- **Relationships**: business_id → businesses

#### bookings ✅
- **Purpose**: Appointment and service booking management
- **Key Fields**: id, provider_id, customer_id, service_id, business_id, status
- **Status Flow**: pending → confirmed → in_progress → completed/cancelled
- **Relationships**: provider_id → service_providers, customer_id → customers

#### services ✅
- **Purpose**: Service catalog management
- **Key Fields**: id, name, description, base_price, duration_hours, business_id
- **Relationships**: business_id → businesses

### Marketing Module Tables (Verified)

#### marketing_gift_cards ✅
- **Purpose**: Gift card product management
- **Key Fields**: id, business_id, name, code, amount, expires_in_months
- **Relationships**: business_id → businesses

#### gift_card_instances ✅
- **Purpose**: Individual gift card instances
- **Key Fields**: id, business_id, gift_card_id, unique_code, current_balance, status
- **Relationships**: business_id → businesses, gift_card_id → marketing_gift_cards

#### gift_card_transactions ✅
- **Purpose**: Gift card transaction tracking
- **Key Fields**: id, gift_card_instance_id, transaction_type, amount, balance_before/after
- **Relationships**: gift_card_instance_id → gift_card_instances

#### marketing_daily_discounts ✅
- **Purpose**: Time-based promotional discounts (frontend only)
- **Key Fields**: id, business_id, name, discount_type, start/end_time, days
- **Relationships**: business_id → businesses

#### marketing_coupons ❓
- **Status**: Referenced in frontend but no API found
- **Purpose**: Discount coupon management (frontend only)
- **Key Fields**: id, business_id, code, discount_type, discount_value, usage_limit

### Location Management Tables (Verified)

#### locations ✅
- **Purpose**: Business location and service area management
- **Key Fields**: id, business_id, name, address, latitude, longitude, location_type
- **Geographic Features**: service_radius_km, service_area_polygon
- **Relationships**: business_id → businesses

#### location_zip_codes ✅
- **Purpose**: Service area zip code management
- **Key Fields**: id, location_id, zip_code, country, active
- **Relationships**: location_id → locations

### Other Tables (Verified)

#### leads ✅
- **Purpose**: Lead management for sales
- **Key Fields**: id, business_id, name, phone, email, tags, status
- **Relationships**: business_id → businesses

#### provider_invitations ✅
- **Purpose**: Provider onboarding invitations
- **Key Fields**: id, business_id, email, invitation_token, status
- **Relationships**: business_id → businesses, invited_by → auth.users

#### provider_availability ✅
- **Purpose**: Provider scheduling and availability
- **Key Fields**: id, provider_id, day_of_week, start_time, end_time, is_available
- **Relationships**: provider_id → service_providers

---

## 3. Current Features & Completion Status (Verified)

### ✅ COMPLETED (Production Ready)

#### Core Platform Infrastructure
- **Multi-tenant Architecture**: Complete business isolation with RLS policies
- **Authentication System**: NextAuth.js integration with Supabase
- **Role-Based Access Control**: customer, provider, admin, super-admin roles
- **Business Context**: Automatic business switching and data filtering

#### User Management
- **Provider Management**: Complete CRUD with password management
- **Customer Management**: Full customer lifecycle with analytics
- **Profile Management**: Real-time editing with database sync
- **Invitation System**: Provider onboarding with email invitations

#### Booking System
- **Service Catalog**: Basic service management
- **Appointment Booking**: Basic booking flow with status tracking
- **Provider Assignment**: Manual provider assignment

#### Marketing Module (Partial)
- **Gift Card System**: ✅ Complete gift card lifecycle with transaction tracking
- **Coupon Management**: ❌ Frontend only, no backend API
- **Email Campaigns**: ❌ Frontend components only
- **Daily Discounts**: ❌ Frontend form only, no backend

#### Location Management
- **Multi-location Support**: ✅ Complete with APIs
- **Interactive Maps**: ✅ Polygon drawing and geocoding
- **Zip Code Management**: ✅ Bulk operations and file upload

### 🟡 PARTIALLY IMPLEMENTED

#### Booking System
- **Payment Integration**: Basic Stripe setup (limited webhook handling)
- **Provider Matching**: Manual assignment only (no automatic matching)

#### Marketing Module
- **Coupon Frontend**: Complete UI but no backend implementation
- **Email Templates**: Basic template structure only

### ❌ NOT IMPLEMENTED

#### Industry-Specific Modules
- **Home Cleaning Module**: Empty API directories, frontend components only
- **Advanced Analytics**: Not implemented
- **Advanced Reporting**: Not implemented
- **Mobile Optimization**: Basic responsive design only

---

## 4. Business Logic Rules (Verified from Code)

#### Authentication Rules
- **Multi-tenant Isolation**: All API calls require business context verification
- **Role-Based Access**: Middleware enforces role-based route protection
- **Session Management**: JWT tokens with Supabase auth

#### Booking Rules
- **Business Context**: All bookings filtered by business_id
- **Status Flow**: pending → confirmed → in_progress → completed/cancelled
- **Provider Assignment**: Manual assignment through admin interface

#### Gift Card Rules
- **Transaction Types**: purchase, redemption, refund, adjustment
- **Balance Tracking**: Real-time balance updates with transaction history
- **Business Isolation**: Gift cards isolated by business_id

#### Location Rules
- **Geographic Features**: Support for polygons and circular service areas
- **Zip Code Management**: Bulk upload/download operations
- **Service Area Detection**: Point-in-polygon checking

---

## 5. Authentication & Permissions System (Verified)

### Authentication Flow
- **NextAuth.js Integration**: Custom adapter for Supabase
- **Middleware Protection**: Route-based access control in `middleware.ts`
- **Business Context**: Multi-tenant filtering in API routes

### Role-Based Access Control (Verified from middleware)

#### Customer Role
- **Access**: Customer dashboard, booking management
- **API Access**: Limited to own bookings and profile

#### Provider Role  
- **Access**: Provider dashboard, schedule management
- **API Access**: Limited to assigned bookings and profile

#### Admin Role (Business Owner)
- **Access**: Full business management, provider management
- **API Access**: Full business data access

#### Super Admin Role
- **Access**: Platform administration
- **API Access**: Cross-business access

### Security Implementation (Verified)
- **Row Level Security**: PostgreSQL RLS policies on tables
- **API Validation**: Zod schema validation on endpoints
- **Business Isolation**: business_id filtering on all queries

---

## 6. Environment Variables (Verified from .env.example)

### Required Environment Variables

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://gpalzskadkrfedlwqobq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwYWx6c2thZGtyZmVkbHdxb2JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5OTY4NzcsImV4cCI6MjA4NDU3Mjg3N30.CgsgFS3Tglce8LhJ6jy8iwAU02uXNxt1_prI4-KnV2c
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwYWx6c2thZGtyZmVkbHdxb2JxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODk5Njg3NywiZXhwIjoyMDg0NTcyODc3fQ.DEBEmRaiuYAmqzuve-4WO7j_OI388BM_wMsCwT9OBmE

# Stripe Payment Processing
STRIPE_SECRET_KEY=your-stripe-secret-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=your-webhook-secret

# Application URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=https://www.orbytservice.com/

# Email Service (Resend)
RESEND_API_KEY=re_MMzU8AP5_36ecKHduvWqazLgxyVErcJvX
RESEND_FROM_EMAIL=noreply@orbytservice.com
```

---

## 7. Deployment & Setup Instructions (Verified)

### Local Development Setup

#### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- Stripe account (for payments)

#### Setup Steps

1. **Clone Repository**
```bash
git clone <repository-url>
cd orbyt
```

2. **Install Dependencies**
```bash
npm install
```

3. **Environment Setup**
```bash
cp .env.example .env.local
# Edit .env.local with your credentials (use actual values from .env.example)
```

4. **Database Setup**
```bash
# Run database setup scripts
psql -h your-host -U your-user -d your-db < database/full_schema.sql
# Or use Supabase dashboard to run SQL scripts
```

5. **Start Development Server**
```bash
npm run dev
# Application available at http://localhost:3000
```

### Production Deployment

#### Vercel (Recommended)
1. **Connect Repository**: Link GitHub repository to Vercel
2. **Environment Variables**: Add all required environment variables from .env.example
3. **Build Settings**: Use Next.js build settings (auto-detected)
4. **Deploy**: Push to main branch triggers deployment

---

## 8. Known Issues & Technical Debt (Verified)

### High Priority Issues

#### Missing Backend APIs
- **Marketing Coupons**: Frontend complete but no backend implementation
- **Email Campaigns**: Frontend components exist but no email sending API
- **Daily Discounts**: Frontend form exists but no backend logic

#### Empty Industry Modules
- **Cleaning Industry**: API directories are empty, frontend components only
- **Advanced Features**: No automatic provider matching, limited analytics

#### Payment System
- **Stripe Integration**: Basic setup only, limited webhook handling
- **Payment Processing**: Basic implementation, needs enhancement

### Medium Priority Issues

#### Performance
- **Large Data Sets**: No pagination implemented in some lists
- **Real-time Updates**: Limited Supabase real-time subscriptions

#### Code Quality
- **Type Safety**: Some components use `any` type
- **Error Handling**: Generic error messages in some API endpoints

### Low Priority Issues
- **Mobile Responsiveness**: Basic responsive design, not mobile-first
- **Testing**: Limited unit test coverage
- **Documentation**: API documentation incomplete for some endpoints

---

## 9. Critical Information for Continuation

### What Works Well (Don't Break)
1. **Multi-tenant Architecture**: Solid business isolation with RLS
2. **Authentication System**: Complete role-based access control
3. **Provider Management**: Full CRUD operations working
4. **Gift Card System**: Complete implementation with transactions
5. **Location Management**: Full geographic features working
6. **Business Context**: Proper multi-tenant filtering

### What Needs Completion
1. **Marketing Backend**: Implement coupon and email campaign APIs
2. **Cleaning Industry**: Implement the empty API directories
3. **Payment Enhancement**: Complete Stripe webhook handling
4. **Analytics**: Implement business analytics dashboard
5. **Mobile Optimization**: Improve mobile experience

### Key Files for Development
1. `src/middleware.ts` - Authentication and business context
2. `src/lib/supabaseClient.ts` - Database connection
3. `src/contexts/BusinessContext.tsx` - Multi-tenant state
4. `database/full_schema.sql` - Complete database structure
5. `src/app/api/` - All backend API endpoints

### Development Guidelines
1. **Multi-tenant First**: Always consider business isolation
2. **API Pattern**: Follow existing API patterns (business context, validation)
3. **Frontend Components**: Use existing component library (shadcn/ui)
4. **Database Changes**: Create migration scripts for schema changes

---

## Conclusion

Orbyt has a **solid foundation** with working multi-tenant architecture, authentication, and several complete modules (providers, gift cards, locations). However, **significant gaps exist** in the marketing backend and industry-specific modules.

**Immediate Priorities for New Developer:**
1. Complete marketing backend APIs (coupons, email campaigns)
2. Implement cleaning industry module APIs
3. Enhance payment processing with proper webhooks
4. Add analytics and reporting features

The codebase is well-structured and follows modern practices, making it ready for continued development once the missing backend implementations are completed.
