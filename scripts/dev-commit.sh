#!/bin/bash

# HandyLabs Growth Agent - Development Commit Script

echo "🚀 HandyLabs Growth Agent - Development Commit"
echo "=============================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the handylabs-growth-agent directory"
    exit 1
fi

# Check git status
if [ -z "$(git status --porcelain)" ]; then
    echo "✅ No changes to commit"
    exit 0
fi

# Show current status
echo "📊 Current changes:"
git status --short

# Ask for commit message
echo ""
read -p "💬 Enter commit message: " commit_message

if [ -z "$commit_message" ]; then
    echo "❌ Commit message cannot be empty"
    exit 1
fi

# Stage all changes
echo "📦 Staging changes..."
git add .

# Commit
echo "💾 Committing changes..."
git commit -m "$commit_message"

# Ask if user wants to push
read -p "🚀 Push to remote? (y/n): " push_choice

if [[ $push_choice =~ ^[Yy]$ ]]; then
    echo "📤 Pushing to remote..."
    git push
    echo "✅ Changes pushed successfully!"
else
    echo "📋 Changes committed locally. Run 'git push' when ready."
fi

echo ""
echo "🎉 Done! Happy coding! 🚀" 