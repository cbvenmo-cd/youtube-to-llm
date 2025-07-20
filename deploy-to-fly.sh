#!/bin/bash

# Deploy YouTube-to-LLM to Fly.io with updated modern UI

echo "🚀 Deploying YouTube-to-LLM with modern UI to Fly.io..."

# Ensure we're in the right directory
cd ~/Projects/yva

# Deploy to Fly.io
fly deploy

echo "✅ Deployment complete! Check https://youtube-to-llm.fly.dev"
