# Mailgun Email Integration Setup

## 🚀 Quick Setup Guide

### 1. Get Mailgun API Key
1. Go to [Mailgun Dashboard](https://app.mailgun.com/)
2. Sign up or login
3. Go to **Settings** → **API Keys**
4. Click **"Add New Key"**
5. Give it a name (e.g., "Provider Invitations")
6. Copy the **Private API Key**

### 2. Get Your Domain
1. In Mailgun dashboard, go to **Domains**
2. You'll see a **sandbox domain** (e.g., `sandbox123.mailgun.org`)
3. **For testing**: Use the sandbox domain
4. **For production**: Add your own domain

### 3. Add Environment Variables
Add these to your `.env` file:

```env
# Mailgun Configuration
MAILGUN_API_KEY=key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MAILGUN_DOMAIN=sandbox123.mailgun.org
MAILGUN_FROM_EMAIL=noreply@sandbox123.mailgun.org
MAILGUN_FROM_NAME=Your Business Name
```

### 4. Sandbox Domain Setup (Testing Only)
1. In Mailgun dashboard, go to **Authorized Recipients**
2. Add the email addresses you want to test with
3. **Only these emails** will receive emails from sandbox domain

## 📧 Current Integration Status

✅ **Mailgun package installed**
✅ **Email service updated** 
✅ **Fallback to console** if not configured
✅ **Professional email templates** ready

## 🔄 How It Works

### With Mailgun Configured:
- ✅ Sends real emails to providers
- ✅ Professional HTML templates
- ✅ Delivery tracking
- ✅ Error handling with fallback

### Without Mailgun (Development):
- ✅ Logs email content to console
- ✅ Shows invitation URLs
- ✅ Perfect for testing
- ✅ No API key required

## 🧪 Testing

### Test Without API Key:
1. Add a provider from admin panel
2. Check console for email content
3. Copy invitation URL from console
4. Test complete flow

### Test With API Key:
1. Add MAILGUN credentials to .env
2. Add test email to **Authorized Recipients**
3. Restart development server
4. Add a provider
5. Check your email for invitation

## 📊 Mailgun Free Tier Limits
- **5,000 emails/month** (100/day for first 3 months)
- **Perfect for development & small business**
- **Better than SendGrid's 100/day**

## 🎯 Next Steps
1. Get your Mailgun API key
2. Add to .env file
3. Add test email to Authorized Recipients
4. Restart server: `npm run dev`
5. Test with a real provider invitation

## 🔧 Production Setup
1. Add your own domain to Mailgun
2. Verify DNS records (MX, TXT, CNAME)
3. Update MAILGUN_DOMAIN in .env
4. Update MAILGUN_FROM_EMAIL

Ready to send professional provider invitations! 🎉
