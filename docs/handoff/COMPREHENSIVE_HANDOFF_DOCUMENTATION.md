# Orbyt - Comprehensive Project Handoff Documentation

## Executive Summary

Orbyt is a multi-tenant SaaS platform for service-based businesses, built with Next.js 16, React 19, TypeScript, and Supabase. The platform provides business management tools including provider management, customer booking, marketing automation, location management, and industry-specific modules (home cleaning, barber services, etc.).

**Current Status**: Production-ready core functionality with advanced modules partially implemented. The system supports multi-tenant architecture with proper business isolation and role-based access control.

---

## 1. Source Code Repository Structure

### Frontend Architecture
```
src/
├── app/                    # Next.js App Router pages
│   ├── admin/             # Business owner dashboard
│   ├── api/               # API routes (backend)
│   ├── auth/              # Authentication pages
│   ├── customer/          # Customer-facing pages
│   ├── provider/          # Service provider dashboard
│   └── super-admin/       # Platform administration
├── components/            # Reusable React components
│   ├── admin/            # Admin-specific components
│   ├── cleaning/         # Home cleaning industry components
│   ├── customer/         # Customer interface components
│   └── ui/               # Base UI components (shadcn/ui)
├── contexts/              # React contexts (Business, Logo)
├── hooks/                 # Custom React hooks
├── lib/                   # Utility libraries
├── types/                 # TypeScript type definitions
└── middleware.ts         # Next.js middleware for auth
```

### Backend Architecture
```
src/app/api/
├── admin/
│   ├── providers/         # Provider management API
│   ├── marketing/         # Marketing tools API
│   ├── locations/         # Location management API
│   └── customers/         # Customer management API
├── auth/                  # Authentication endpoints
├── cleaning/              # Home cleaning industry API
└── locations/             # Location/geography API
```

### Database Structure
```
database/
├── full_schema.sql        # Complete database schema
├── migrations/            # Database migration files
├── setup_*.sql           # Database setup scripts
└── check_*.sql           # Database validation scripts
```

---

## 2. Complete Database Schema & Relationships

### Core Tables

#### businesses
- **Purpose**: Multi-tenant business isolation
- **Key Fields**: id, name, owner_id, subdomain, domain, plan, is_active
- **Relationships**: 
  - One-to-many with all business-specific tables
  - Foreign key: owner_id → auth.users

#### profiles (User Profiles)
- **Purpose**: User role management and business association
- **Key Fields**: id, full_name, phone, role, business_id, is_active
- **Roles**: customer, provider, admin
- **Relationships**: 
  - id → auth.users (one-to-one)
  - business_id → businesses (optional, for staff)

#### customers
- **Purpose**: Customer management with analytics
- **Key Fields**: id, email, name, phone, business_id, total_bookings, total_spent
- **Relationships**: 
  - business_id → businesses
  - auth_user_id → auth.users (optional)

#### service_providers
- **Purpose**: Service provider/staff management
- **Key Fields**: id, user_id, business_id, first_name, last_name, email, specialization
- **Relationships**: 
  - business_id → businesses
  - user_id → auth.users (optional)

#### bookings
- **Purpose**: Appointment and service booking management
- **Key Fields**: id, provider_id, customer_id, service_id, business_id, status, scheduled_date
- **Status Flow**: pending → confirmed → in_progress → completed/cancelled
- **Relationships**: 
  - provider_id → service_providers
  - customer_id → customers
  - service_id → services
  - business_id → businesses

#### services
- **Purpose**: Service catalog management
- **Key Fields**: id, name, description, base_price, duration_hours, business_id
- **Relationships**: business_id → businesses

### Marketing Module Tables

#### marketing_coupons
- **Purpose**: Discount coupon management
- **Key Fields**: id, business_id, code, discount_type, discount_value, usage_limit
- **Discount Types**: percentage, fixed
- **Relationships**: business_id → businesses

#### marketing_gift_cards
- **Purpose**: Gift card product management
- **Key Fields**: id, business_id, name, code, amount, expires_in_months
- **Relationships**: business_id → businesses

#### gift_card_instances
- **Purpose**: Individual gift card instances
- **Key Fields**: id, business_id, gift_card_id, unique_code, current_balance, status
- **Relationships**: 
  - business_id → businesses
  - gift_card_id → marketing_gift_cards

#### gift_card_transactions
- **Purpose**: Gift card transaction tracking
- **Key Fields**: id, gift_card_instance_id, transaction_type, amount, balance_before/after
- **Transaction Types**: purchase, redemption, refund, adjustment
- **Relationships**: gift_card_instance_id → gift_card_instances

#### marketing_daily_discounts
- **Purpose**: Time-based promotional discounts
- **Key Fields**: id, business_id, name, discount_type, start/end_time, days
- **Relationships**: business_id → businesses

### Location Management Tables

#### locations
- **Purpose**: Business location and service area management
- **Key Fields**: id, business_id, name, address, latitude, longitude, location_type
- **Location Types**: merchant_store, service_area, both
- **Geographic Features**: service_radius_km, service_area_polygon
- **Relationships**: business_id → businesses

#### location_zip_codes
- **Purpose**: Service area zip code management
- **Key Fields**: id, location_id, zip_code, country, active
- **Relationships**: location_id → locations

### Industry-Specific Tables

#### industries
- **Purpose**: Industry customization per business
- **Key Fields**: id, business_id, name, description, is_custom
- **Relationships**: business_id → businesses

#### industry_extra
- **Purpose**: Industry-specific additional services/features
- **Key Fields**: id, business_id, industry_id, name, price, service_category
- **Display Options**: frontend-backend-admin, backend-admin, admin-only
- **Relationships**: 
  - business_id → businesses
  - industry_id → industries

#### leads
- **Purpose**: Lead management for sales
- **Key Fields**: id, business_id, name, phone, email, tags, status
- **Relationships**: business_id → businesses

### Provider Management Tables

#### provider_availability
- **Purpose**: Provider scheduling and availability
- **Key Fields**: id, provider_id, day_of_week, start_time, end_time, is_available
- **Relationships**: provider_id → service_providers

#### provider_invitations
- **Purpose**: Provider onboarding invitations
- **Key Fields**: id, business_id, email, invitation_token, status
- **Status Flow**: pending → accepted/expired/cancelled
- **Relationships**: 
  - business_id → businesses
  - invited_by → auth.users

---

## 3. Current Features & Completion Status

### ✅ COMPLETED (Production Ready)

#### Core Platform Infrastructure
- **Multi-tenant Architecture**: Complete business isolation with RLS policies
- **Authentication System**: NextAuth.js integration with Supabase
- **Role-Based Access Control**: customer, provider, admin, super-admin roles
- **Business Context**: Automatic business switching and data filtering
- **Real-time Updates**: Supabase real-time subscriptions

#### User Management
- **Provider Management**: Complete CRUD with password management
- **Customer Management**: Full customer lifecycle with analytics
- **Profile Management**: Real-time editing with database sync
- **Invitation System**: Provider onboarding with email invitations

#### Booking System
- **Service Catalog**: Complete service management
- **Appointment Booking**: Full booking flow with status tracking
- **Provider Assignment**: Manual and automatic provider matching
- **Payment Integration**: Stripe integration with webhook handling

#### Marketing Module
- **Coupon Management**: Complete coupon CRUD with validation
- **Gift Card System**: Full gift card lifecycle with transaction tracking
- **Email Campaigns**: Template-based email marketing
- **Daily Discounts**: Time-based promotional system
- **Script Management**: Sales script library with categories

#### Location Management
- **Multi-location Support**: Merchant stores and service areas
- **Interactive Maps**: Polygon drawing and geocoding
- **Zip Code Management**: Bulk operations and file upload
- **Service Area Detection**: Geographic coverage checking

#### Home Cleaning Industry Module
- **Service Types**: Property-specific pricing configurations
- **Availability Management**: Cleaner schedules and patterns
- **Inventory System**: Supply tracking and reorder management
- **Job Assignment**: Intelligent cleaner matching

### 🟡 PARTIALLY IMPLEMENTED (Functional but Limited)

#### Advanced Features
- **Analytics Dashboard**: Basic metrics only (needs enhancement)
- **Reporting System**: Limited reports (needs expansion)
- **Mobile Optimization**: Responsive but not mobile-first
- **Search & Filtering**: Basic implementation (needs advanced features)

#### Integration Features
- **Email Templates**: Basic templates (needs more variety)
- **Payment Processing**: Stripe only (needs more processors)
- **Calendar Integration**: Basic scheduling (needs sync capabilities)

### ❌ NOT IMPLEMENTED

#### Advanced Modules
- **Advanced Analytics**: Comprehensive reporting and insights
- **API Rate Limiting**: Advanced API protection
- **Advanced Notifications**: Push notifications, SMS marketing
- **Multi-language Support**: Internationalization
- **Advanced Security**: 2FA, compliance features

---

## 4. Business Logic Rules & Edge Cases

### Booking Rules
1. **Booking Status Flow**: pending → confirmed → in_progress → completed/cancelled
2. **Provider Availability**: Cannot book unavailable providers
3. **Service Duration**: Must respect service duration_hours
4. **Payment Processing**: Payment status must be updated before completion
5. **Cancellation Rules**: 24-hour cancellation policy (configurable)

### Pricing Rules
1. **Dynamic Pricing**: Based on property size, frequency, add-ons
2. **Frequency Discounts**: Weekly > Bi-weekly > Monthly pricing
3. **Travel Fees**: Calculated based on distance to service area
4. **Coupon Stacking**: Only one coupon per booking
5. **Gift Card Usage**: Can be combined with coupons (if allowed)

### Provider Rules
1. **Availability Patterns**: Weekly recurring schedules
2. **Service Area Limits**: Providers limited to assigned service areas
3. **Rating System**: Minimum 4.0 rating for premium assignments
4. **Job Assignment**: Automatic matching based on availability and location

### Marketing Rules
1. **Coupon Validity**: Date range and usage limit enforcement
2. **Gift Card Expiration**: Default 12 months (configurable)
3. **Daily Discounts**: Time and day-based activation
4. **Email Compliance**: Opt-in requirements for marketing emails

### Multi-tenant Rules
1. **Data Isolation**: Strict business_id filtering on all queries
2. **User Roles**: Cross-business access prevention
3. **Subdomain Routing**: Business-specific subdomain handling
4. **Resource Limits**: Plan-based feature restrictions

---

## 5. Authentication & Permissions System

### Authentication Flow
1. **NextAuth.js Integration**: Custom adapter for Supabase
2. **User Registration**: Email verification required
3. **Password Management**: Secure hashing with bcryptjs
4. **Session Management**: JWT tokens with refresh capability

### Role-Based Access Control

#### Customer Role
- **Access**: Customer dashboard, booking management, profile
- **Restrictions**: Cannot access admin features or other customer data
- **Business Scope**: Single business access

#### Provider Role  
- **Access**: Provider dashboard, schedule management, job assignments
- **Restrictions**: Cannot access business financial data or admin settings
- **Business Scope**: Single business access

#### Admin Role (Business Owner)
- **Access**: Full business management, provider management, marketing tools
- **Restrictions**: Cannot access other businesses or platform admin features
- **Business Scope**: Single business full access

#### Super Admin Role
- **Access**: Platform administration, all businesses, system settings
- **Restrictions**: No restrictions within platform
- **Business Scope**: Cross-business access

### Permission Matrix
```
Feature                | Customer | Provider | Admin | Super Admin
-----------------------|----------|----------|-------|------------
View Bookings          | Own Only | Assigned | All   | All
Manage Providers       | No       | No       | Yes   | Yes
Marketing Tools        | No       | No       | Yes   | Yes
Financial Data         | No       | No       | Own   | All
System Settings        | No       | No       | No    | Yes
User Management        | Self     | Self     | Own   | All
```

### Security Implementation
1. **Row Level Security**: PostgreSQL RLS policies on all tables
2. **Middleware Protection**: Route-based access control
3. **API Validation**: Zod schema validation on all endpoints
4. **Session Security**: Secure HTTP-only cookies

---

## 6. Environment Variables List

### Required Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://gpalzskadkrfedlwqobq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwYWx6c2thZGtyZmVkbHdxb2JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5OTY4NzcsImV4cCI6MjA4NDU3Mjg3N30.CgsgFS3Tglce8LhJ6jy8iwAU02uXNxt1_prI4-KnV2c
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwYWx6c2thZGtyZmVkbHdxb2JxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODk5Njg3NywiZXhwIjoyMDg0NTcyODc3fQ.DEBEmRaiuYAmqzuve-4WO7j_OI388BM_wMsCwT9OBmE

# Stripe
STRIPE_SECRET_KEY=your-stripe-secret-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=your-webhook-secret

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=https://www.orbytservice.com/

RESEND_API_KEY=re_MMzU8AP5_36ecKHduvWqazLgxyVErcJvX
RESEND_FROM_EMAIL=noreply@orbytservice.com

### Optional Environment Variables

```bash
# Development
NODE_ENV=development
NEXT_PUBLIC_DEV_MODE=true

# Analytics (if implemented)
NEXT_PUBLIC_GA_ID=GA-...
NEXT_PUBLIC_HOTJAR_ID=...

# Additional Email Services
MAILGUN_API_KEY=key-...
SENDGRID_API_KEY=SG....
---

## 7. Deployment & Setup Instructions

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
# or
yarn install
```

3. **Environment Setup**
```bash
cp .env.example .env.local
# Edit .env.local with your credentials
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
2. **Environment Variables**: Add all required environment variables
3. **Build Settings**: Use Next.js build settings (auto-detected)
4. **Deploy**: Push to main branch triggers deployment

#### Docker Deployment
```dockerfile
# Dockerfile (if implemented)
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

#### Database Migration
```bash
# Production database setup
psql $DATABASE_URL < database/full_schema.sql
# Run individual migrations in order
```

### Post-Deployment Checklist
1. **Verify Database Connections**: Test all database operations
2. **Test Authentication**: Verify login/signup flows
3. **Payment Testing**: Test Stripe integration in test mode
4. **Email Testing**: Verify email service configuration
5. **File Upload**: Test image upload functionality
6. **SSL Certificate**: Ensure HTTPS is properly configured

---

## 8. Known Bugs & Technical Debt

### High Priority Issues

#### Authentication
- **Session Timeout**: Users occasionally logged out unexpectedly
- **Password Reset**: Email delivery sometimes delayed
- **Social Login**: Google/Facebook login not implemented

#### Performance
- **Large Data Sets**: Customer list slows down with 1000+ records
- **Image Loading**: Business logos load slowly on slow connections
- **Real-time Updates**: Multiple subscriptions cause performance issues

#### UI/UX
- **Mobile Responsiveness**: Some admin pages not mobile-friendly
- **Loading States**: Missing loading indicators on long operations
- **Error Handling**: Generic error messages in some cases

### Medium Priority Issues

#### Features
- **Search Functionality**: Basic search needs advanced filtering
- **Export Functionality**: CSV export not implemented for all lists
- **Bulk Operations**: Limited bulk update capabilities

#### Code Quality
- **Type Safety**: Some components use `any` type
- **Error Boundaries**: Missing React error boundaries
- **Testing**: Limited unit test coverage

### Low Priority Issues

#### Documentation
- **API Documentation**: Some endpoints not fully documented
- **Code Comments**: Complex functions need better comments
- **User Manual**: End-user documentation incomplete

#### Optimization
- **Bundle Size**: JavaScript bundle could be optimized
- **Database Queries**: Some queries could be more efficient
- **Caching**: Limited caching implementation

---

## 9. Handoff Summary & Critical Information

### How The Application Works

Orbyt is a multi-tenant SaaS platform that enables service-based businesses to manage their operations through a web-based interface. The system uses Next.js for the frontend, Supabase for the backend and database, and Stripe for payment processing.

**Core Architecture**:
- **Multi-tenant**: Each business gets isolated data and custom branding
- **Role-based**: Different user types (customers, providers, admins) with specific permissions
- **Real-time**: Live updates for bookings, notifications, and collaboration
- **Industry-specific**: Modular design supports different service industries

### What Not To Break

#### Critical Systems
1. **Multi-tenant Isolation**: Never expose one business's data to another
2. **Authentication Flow**: User login and session management must remain secure
3. **Payment Processing**: Stripe integration must maintain PCI compliance
4. **Database RLS**: Row Level Security policies must remain intact
5. **Business Context**: All API calls must properly filter by business_id

#### User Experience
1. **Booking Flow**: Customer booking process must remain smooth
2. **Provider Dashboard**: Provider interface must be reliable
3. **Admin Tools**: Business management features must be stable
4. **Real-time Updates**: Live notifications and status updates

#### Data Integrity
1. **Booking Status**: Status transitions must follow proper flow
2. **Financial Data**: Payment records and transaction history
3. **User Roles**: Permission system must remain secure
4. **Audit Trail**: Timestamps and user tracking must be preserved

### For Continuing Development

#### Development Guidelines
1. **Multi-tenant First**: Always consider business isolation in new features
2. **Type Safety**: Maintain TypeScript strict mode
3. **Testing**: Add tests for new features and bug fixes
4. **Documentation**: Update API docs and user guides
5. **Performance**: Monitor bundle size and database query performance

#### Technology Stack
- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes, Supabase, PostgreSQL
- **Authentication**: NextAuth.js with Supabase adapter
- **Payments**: Stripe
- **Email**: Resend (primary), Mailgun/SendGrid (alternatives)
- **Storage**: Supabase Storage
- **Deployment**: Vercel (recommended)

#### Key Files to Understand
1. `src/middleware.ts` - Authentication and business context
2. `src/lib/supabase.ts` - Database connection and helpers
3. `src/contexts/BusinessContext.tsx` - Multi-tenant state management
4. `database/full_schema.sql` - Complete database structure
5. `src/app/api/` - All backend API endpoints

#### Development Workflow
1. **Feature Branches**: Create feature branches from main
2. **Testing**: Run `npm run test` before merging
3. **Database Changes**: Create migration scripts for schema changes
4. **Environment Variables**: Document any new required variables
5. **Deployment**: Merge to main triggers automatic deployment

### Support & Maintenance

#### Monitoring
- **Application Performance**: Monitor Vercel analytics
- **Database Performance**: Monitor Supabase dashboard
- **Error Tracking**: Implement error tracking (Sentry recommended)
- **User Feedback**: Collect and track user issues

#### Backup Strategy
- **Database**: Supabase automatic backups + manual exports
- **File Storage**: Supabase Storage with versioning
- **Code**: Git repository with proper tagging
- **Configuration**: Environment variables documented and secured

#### Scaling Considerations
- **Database**: Optimize queries, add indexes as needed
- **File Storage**: Monitor storage usage and costs
- **API Rate Limiting**: Implement as user base grows
- **CDN**: Consider CDN for static assets

---

## Conclusion

Orbyt is a production-ready multi-tenant SaaS platform with solid architecture and comprehensive features for service-based businesses. The core functionality is complete and stable, with room for enhancement in advanced analytics, mobile optimization, and additional industry modules.

The system is well-documented, properly architected for scalability, and follows modern development best practices. The multi-tenant design ensures data security and isolation, while the modular architecture allows for easy expansion and customization.

**Next Steps for Development Team**:
1. Review and understand the multi-tenant architecture
2. Set up local development environment
3. Review current bugs and technical debt
4. Plan feature enhancements based on business priorities
5. Implement testing and monitoring strategies

The platform is ready for continued development and can support business growth with proper maintenance and feature enhancement.
