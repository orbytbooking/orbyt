# Orbyt - Multi-tenant Service Business Platform

A comprehensive SaaS platform for service-based businesses with multi-tenant architecture, built with Next.js 16, React 19, TypeScript, and Supabase.

## 🚀 Quick Start

```bash
# Clone and setup
git clone <repository-url>
cd orbyt
npm install

# Environment setup
cp .env.example .env.local
# Edit .env.local with your credentials

# Database setup
# Run database/setup.sql scripts in Supabase

# Start development
npm run dev
```

## 📁 Project Structure

```
orbyt/
├── src/                    # Application source code
│   ├── app/               # Next.js App Router
│   ├── components/        # React components
│   ├── contexts/          # React contexts
│   ├── lib/               # Utility libraries
│   └── middleware.ts      # Next.js middleware
├── database/              # Database schemas and migrations
├── docs/                  # Documentation
│   ├── handoff/          # Project handoff documentation
│   ├── setup/            # Setup and configuration guides
│   └── troubleshooting/  # Troubleshooting guides
├── scripts/               # Utility scripts
│   ├── database/         # Database utilities
│   ├── test/             # Test scripts
│   ├── setup/            # Setup scripts
│   └── debug/            # Debug utilities
├── public/               # Static assets
└── .github/              # GitHub workflows
```

## 🏗️ Architecture

### Multi-tenant SaaS Platform
- **Business Isolation**: Complete data separation between businesses
- **Role-Based Access**: Customer, Provider, Admin, Super-Admin roles
- **Real-time Updates**: Supabase real-time subscriptions
- **Secure Authentication**: NextAuth.js with Supabase integration

### Key Features
- ✅ **Provider Management**: Complete CRUD with scheduling
- ✅ **Location Management**: Geographic service areas with maps
- ✅ **Gift Card System**: Full transaction tracking
- ✅ **Booking System**: Appointment management
- 🟡 **Marketing Tools**: Partial implementation
- ❌ **Industry Modules**: In development

## 📚 Documentation

### Handoff Documentation
- [`docs/handoff/ACCURATE_HANDOFF_DOCUMENTATION.md`](docs/handoff/ACCURATE_HANDOFF_DOCUMENTATION.md) - Complete project overview
- [`docs/handoff/COMPREHENSIVE_HANDOFF_DOCUMENTATION.md`](docs/handoff/COMPREHENSIVE_HANDOFF_DOCUMENTATION.md) - Detailed technical documentation
- [`docs/handoff/API_DOCUMENTATION.md`](docs/handoff/API_DOCUMENTATION.md) - API reference

### Setup Guides
- [`docs/setup/CI_CD_SETUP.md`](docs/setup/CI_CD_SETUP.md) - CI/CD pipeline setup
- [`docs/setup/BUSINESS_IMAGE_SETUP.md`](docs/setup/BUSINESS_IMAGE_SETUP.md) - Image configuration
- [`docs/setup/MAILGUN_SETUP.md`](docs/setup/MAILGUN_SETUP.md) - Email service setup
- [`docs/setup/RESEND_SETUP.md`](docs/setup/RESEND_SETUP.md) - Email service setup

### Troubleshooting
- [`docs/troubleshooting/TROUBLESHOOT_BUSINESS_LOGO.md`](docs/troubleshooting/TROUBLESHOOT_BUSINESS_LOGO.md) - Logo issues
- [`docs/troubleshooting/COMPLETE_TEST_GUIDE.md`](docs/troubleshooting/COMPLETE_TEST_GUIDE.md) - Testing guide

## 🛠️ Development

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run type-check   # TypeScript type checking
npm run test         # Run all tests
npm run security-audit # Security vulnerability check
```

### Environment Variables
Required environment variables are in `.env.example`:
- Supabase configuration
- Stripe payment processing
- Email service (Resend)
- Application URLs

## 🗄️ Database

### Schema
Complete database schema is available in `database/full_schema.sql`.

### Key Tables
- `businesses` - Multi-tenant business management
- `profiles` - User profiles and roles
- `customers` - Customer management
- `service_providers` - Provider/staff management
- `bookings` - Appointment booking system
- `marketing_gift_cards` - Gift card system
- `locations` - Location and service area management

## 🚀 Deployment

### Vercel (Recommended)
1. Connect repository to Vercel
2. Add environment variables
3. Deploy automatically on push to main

### CI/CD Pipeline
- **Main branch**: Full testing → Production deployment
- **Develop branch**: Testing → Staging deployment
- **Pull requests**: Testing and validation only

## 🔧 Scripts

### Database Scripts (`scripts/database/`)
- Database validation and checking utilities
- Test data management
- Schema verification

### Test Scripts (`scripts/test/`)
- Frontend testing utilities
- Authentication testing
- Image upload testing
- API testing

### Setup Scripts (`scripts/setup/`)
- Environment setup
- Provider invitation setup
- Error fixing utilities

### Debug Scripts (`scripts/debug/`)
- Logo display debugging
- Upload debugging
- Storage verification

## 🏢 Business Context

This is a multi-tenant SaaS platform designed for:
- **Service Businesses**: Cleaning, barber, consulting services
- **Provider Management**: Staff scheduling and assignment
- **Customer Booking**: Online appointment booking
- **Marketing Tools**: Promotions and gift cards
- **Location Management**: Service area definition

## 📞 Support

For technical support or questions:
1. Check troubleshooting documentation
2. Review handoff documentation
3. Check GitHub issues
4. Contact development team

## 📄 License

[Add your license information here]

---

**Note**: This is a production-ready platform with solid multi-tenant architecture. Some features are still in development (see handoff documentation for current status).
