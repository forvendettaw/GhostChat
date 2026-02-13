#!/bin/bash

# GhostChat 缓存清理脚本

echo "🧹 清理浏览器缓存和重新部署..."

cd /Users/scott/GhostChat/GhostChat

# 1. 清理 Next.js 缓存
echo "📦 清理 Next.js 缓存..."
rm -rf .next
rm -rf node_modules/.cache

# 2. 清理 Cloudflare 缓存（添加时间戳）
echo "☁️ 添加时间戳避免缓存..."
echo "CACHE_BUST: $(date +%s)" > cache-bust.txt

# 3. 重新构建
echo "🔨 重新构建..."
npm run build

# 4. 部署
echo "📤 部署到 Cloudflare Pages..."
npx wrangler pages deploy out --project-name=ghostchat --commit-dirty=true

# 5. 清理临时文件
rm cache-bust.txt

echo "✅ 完成！"
echo "🌐 访问: https://ghostchat-24o.pages.dev"
