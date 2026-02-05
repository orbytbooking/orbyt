# CI/CD Pipeline Setup Guide

## Overview
This CI/CD pipeline automates testing, security scanning, and deployment for your Next.js application.

## Pipeline Triggers
- **Push to main**: Full pipeline → Production deployment
- **Push to develop**: Testing → Staging deployment  
- **Pull requests**: Testing and validation only

## Jobs Overview

### 1. Test and Code Quality
- ESLint code quality checks
- TypeScript type checking
- Application build verification
- Artifact upload for deployment

### 2. Security Scan
- npm security audit
- Dependency vulnerability scanning
- High-priority security issue detection

### 3. Database Migration (main branch only)
- Supabase database migrations
- Schema updates
- Data consistency checks

### 4. Deploy to Staging (develop branch)
- Build and deploy to staging environment
- Vercel integration
- Environment-specific configuration

### 5. Deploy to Production (main branch)
- Full production deployment
- Vercel production push
- Slack notifications

### 6. Health Check
- Post-deployment verification
- Application health monitoring
- Smoke test execution

## Required Secrets

Add these to your GitHub repository secrets:

### Supabase
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key

### Vercel
- `VERCEL_TOKEN`: Vercel API token
- `VERCEL_ORG_ID`: Vercel organization ID
- `VERCEL_PROJECT_ID`: Vercel project ID

### Optional
- `SLACK_WEBHOOK_URL`: Slack webhook for deployment notifications

## Setup Instructions

### 1. Vercel Setup
```bash
# Install Vercel CLI
npm i -g vercel

# Link your project
vercel link

# Get environment variables
vercel env ls
```

### 2. Supabase Setup
```bash
# Install Supabase CLI
npm i -g supabase

# Link your project
supabase link

# Test connection
supabase db push --dry-run
```

### 3. GitHub Secrets
Go to: Repository Settings → Secrets and variables → Actions

Add each secret from the list above.

## Environment Variables

Create `.env.example`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Branch Strategy

- `main`: Production-ready code
- `develop`: Staging/feature code
- Feature branches: PR testing only

## Deployment Flow

```
Feature Branch → PR → Testing → Merge to develop → Staging → Merge to main → Production
```

## Monitoring

- GitHub Actions dashboard for pipeline status
- Vercel for deployment metrics
- Slack notifications for production deployments
- Health checks for post-deployment verification

## Troubleshooting

### Common Issues
1. **Build failures**: Check TypeScript errors and dependencies
2. **Secret errors**: Verify all required secrets are set
3. **Migration failures**: Check Supabase connection and schema
4. **Deployment failures**: Verify Vercel configuration

### Debug Commands
```bash
# Test build locally
npm run build

# Test linting
npm run lint

# Check types
npx tsc --noEmit

# Security audit
npm audit
```

## Next Steps

1. Add the required GitHub secrets
2. Configure Vercel deployment
3. Set up Supabase migrations
4. Test the pipeline with a commit
5. Monitor first deployment run
