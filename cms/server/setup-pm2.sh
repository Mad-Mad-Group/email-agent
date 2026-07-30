#!/bin/bash
# PM2 Setup Script — 開機自動啟動 NestJS Server
# 喺 lead_scraper/cms/server/ 目錄下行: bash setup-pm2.sh
#
# ⚠ 已被 ../../deploy-uat.sh + ./pm2.yaml 取代 —— 唔好再用。
#   本腳本用 pm2 名 "lead-cms"，同 pm2.yaml 嘅 "agent-backend" 唔同，
#   兩者一齊行會開出兩個 process 爭同一個 port 4000。
#   保留只為參考舊做法。

set -e

echo "⚠ setup-pm2.sh 已停用，請改用 repo root 嘅 ./deploy-uat.sh server" >&2
echo "  只想本機起 pm2？喺 cms/server/ 內跑: pm2 startOrReload pm2.yaml" >&2
exit 1

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
