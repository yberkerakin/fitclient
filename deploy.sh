#!/bin/bash

# Deployment script for müşteri to üye changes
echo "🚀 Starting deployment process..."

# Step 1: Add all changes
echo "📁 Adding all changes to git..."
git add .
if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to add changes to git"
    exit 1
fi

# Step 2: Commit changes
echo "💾 Committing changes..."
git commit -m "Change 'müşteri' to 'üye' throughout the app"
if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to commit changes"
    exit 1
fi

# Step 3: Push to remote
echo "⬆️ Pushing changes to remote repository..."
git push
if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to push changes"
    exit 1
fi

# Step 4: Deploy to Vercel production
echo "🌐 Deploying to Vercel production..."
vercel --prod
if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to deploy to Vercel"
    exit 1
fi

# Success message
echo ""
echo "✅ Deployment completed successfully!"
echo "🎉 All changes have been committed, pushed, and deployed to production."
echo "🔄 The app now uses 'üye' (member) terminology instead of 'müşteri' (customer)."
echo ""
