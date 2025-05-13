#!/bin/bash

# Show current status
echo "Current git status:"
git status

# Add all changes
echo "Adding all changes..."
git add .

# Commit changes
echo "Committing changes..."
git commit -m "Hide API key status from UI"

# Push to main account (origin)
echo "Pushing to main account (origin)..."
git push origin main

# Push to DAKAEI account
echo "Pushing to DAKAEI account..."
git push dakaei_ai_origin main

echo "All done!" 