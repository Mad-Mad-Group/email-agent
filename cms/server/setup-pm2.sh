#!/bin/bash
# PM2 Setup Script — 開機自動啟動 NestJS Server
# 喺 lead_scraper/cms/server/ 目錄下行: bash setup-pm2.sh

set -e

echo "=== 1. 安裝 pm2 ==="
npm install -g pm2

echo "=== 2. Build NestJS ==="
npm run build

echo "=== 3. 用 pm2 啟動 ==="
pm2 start dist/main.js --name lead-cms --env production

echo "=== 4. 儲存 pm2 進程列表 ==="
pm2 save

echo "=== 5. 設定開機自啟 ==="
echo ""
echo "請複製並執行以下指令（需要 sudo）："
echo ""
pm2 startup

echo ""
echo "=== 完成！==="
echo "常用指令："
echo "  pm2 status        — 查看狀態"
echo "  pm2 logs lead-cms — 查看 log"
echo "  pm2 restart lead-cms — 重啟"
echo "  pm2 stop lead-cms    — 停止"
