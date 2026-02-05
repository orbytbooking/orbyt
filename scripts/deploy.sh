#!/bin/bash

echo "🚀 Provider Invitation Fix - Deployment Script"
echo "============================================="

# Check if we're on the main branch
current_branch=$(git branch --show-current)
if [ "$current_branch" != "main" ]; then
    echo "⚠️  You're not on the main branch. Current branch: $current_branch"
    echo "🔄 Switching to main branch..."
    git checkout main
    git pull origin main
fi

# Merge the changes
echo "📦 Merging provider invitation fixes..."
git merge provider-invitation-fix

# Push to trigger deployment
echo "📤 Pushing to trigger deployment..."
git push origin main

echo ""
echo "✅ Deployment initiated!"
echo ""
echo "📋 Next steps:"
echo "1. Monitor the GitHub Actions workflow"
echo "2. Wait for deployment to complete (usually 2-3 minutes)"
echo "3. Test the provider invitation flow at https://www.orbytservice.com"
echo ""
echo "🧪 Test checklist:"
echo "- Add a provider from admin panel"
echo "- Check email for invitation link"
echo "- Click link (should go to /provider/invite)"
echo "- Set password and create account"
echo "- Try login at /provider/login"
echo ""
echo "🔗 Useful links:"
echo "- GitHub Actions: https://github.com/[your-repo]/actions"
echo "- Vercel Dashboard: https://vercel.com/[your-account]/[your-project]"
echo "- Live Site: https://www.orbytservice.com"
echo ""
echo "🎉 Good luck!"
