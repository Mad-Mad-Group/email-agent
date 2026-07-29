# ClientRadar AI — UAT 全棧部署指南

> **版本**: v1.0（2026-07-29）
> **適用場景**: Frontend 上公司 UAT subdomain + Backend/Worker 部署到另一台 Mac

---

## 目錄

- [1. 架構總覽](#1-架構總覽)
- [2. 前置需求](#2-前置需求)
- [3. 機器 A — Backend + MongoDB](#3-機器-a--backend--mongodb)
- [4. 機器 B — Worker + Hermes CLI](#4-機器-b--worker--hermes-cli)
- [5. 機器 C — Frontend (nginx + subdomain)](#5-機器-c--frontend-nginx--subdomain)
- [6. DNS + SSL 設定](#6-dns--ssl-設定)
- [7. CORS 設定](#7-cors-設定)
- [8. 連通性驗證](#8-連通性驗證)
- [9. Process 管理 (launchd / pm2)](#9-process-管理-launchd--pm2)
- [10. 常見問題排查](#10-常見問題排查)

---

## 1. 架構總覽

```
                     ┌──────────────────────────────┐
                     │   公司 DNS                    │
                     │   uat.clientradar-ai.com      │
                     │        ↓ A record             │
                     └──────────┬───────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────┐
│  機器 C — Frontend Server (nginx)                        │
│  ┌─────────────────────────────────────────────────┐    │
│  │  nginx                                           │    │
│  │  - 443 → serve dist/ (static files)              │    │
│  │  - /api/* → reverse proxy → 機器 A:4000          │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                                │
                     /api/* proxy
                                │
                                ▼
┌─────────────────────────────────────────────────────────┐
│  機器 A — Backend Mac                                    │
│  ┌─────────────────┐  ┌─────────────────────┐          │
│  │  cms/server      │  │  MongoDB             │          │
│  │  (NestJS :4000)  │  │  (:27017)            │          │
│  └─────────────────┘  └─────────────────────┘          │
└─────────────────────────────────────────────────────────┘
                                ▲
                     API login + task claim
                                │
┌─────────────────────────────────────────────────────────┐
│  機器 B — Worker Mac                                     │
│  ┌─────────────────┐  ┌─────────────────────┐          │
│  │  cms/worker      │  │  Hermes CLI          │          │
│  │  (leader.js)     │  │  (~/.hermes/)        │          │
│  └─────────────────┘  └─────────────────────┘          │
└─────────────────────────────────────────────────────────┘
```

> **注意**: 機器 A 同機器 B 可以係同一台 Mac。如果係同機，跳過機器 B 嘅獨立設定，直接喺機器 A 上行 Worker。

---

## 2. 前置需求

### 所有機器

| 項目 | 最低版本 |
|------|---------|
| Node.js | ≥ 18 |
| npm | ≥ 9 |
| Git | ≥ 2.x |

### 機器 A（Backend）額外需要

| 項目 | 說明 |
|------|------|
| MongoDB | ≥ 6.x（本機安裝或 Atlas） |

### 機器 B（Worker）額外需要

| 項目 | 說明 |
|------|------|
| Hermes CLI | `~/.hermes/` 已設定（參考 `uat-deployment-runbook.md`） |
| SSH 到機器 A | 如果 Worker 同 Backend 分機 |

### 機器 C（Frontend Server）額外需要

| 項目 | 說明 |
|------|------|
| nginx | ≥ 1.18 |
| SSL 證書 | Let's Encrypt 或公司內部 CA |

---

## 3. 機器 A — Backend + MongoDB

### 3.1 安裝 MongoDB（如未安裝）

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community@7.0
brew services start mongodb-community@7.0
```

**Linux (Ubuntu):**
```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update && sudo apt install -y mongodb-org
sudo systemctl enable mongod && sudo systemctl start mongod
```

### 3.2 設定 MongoDB 認證（建議）

```bash
mongosh
```
```javascript
use admin
db.createUser({
  user: "clientradar",
  pwd: "YOUR_STRONG_PASSWORD",
  roles: [{ role: "readWrite", db: "lead_scraper" }]
})
```

啟用認證後，connection string 改為：
```
mongodb://clientradar:YOUR_STRONG_PASSWORD@localhost:27017/lead_scraper?authSource=admin
```

### 3.3 設定 MongoDB 允許遠端連線（如果 Worker 喺另一台機）

```bash
# macOS: 編輯 /usr/local/etc/mongod.conf (Intel) 或 /opt/homebrew/etc/mongod.conf (Apple Silicon)
# Linux: 編輯 /etc/mongod.conf

# 將 bindIp 改為：
net:
  bindIp: 127.0.0.1,機器A嘅內網IP
  port: 27017

security:
  authorization: enabled
```

重啟 MongoDB：
```bash
# macOS
brew services restart mongodb-community@7.0
# Linux
sudo systemctl restart mongod
```

### 3.4 Clone + 設定 Backend

```bash
cd ~
git clone <your-repo-url> email_agent
cd email_agent/cms/server
npm install
```

建立 `.env`：
```bash
cp .env.example .env
```

編輯 `cms/server/.env`：
```env
# MongoDB
MONGODB_URI=mongodb://clientradar:YOUR_STRONG_PASSWORD@localhost:27017/lead_scraper?authSource=admin

# JWT
JWT_SECRET=<用 openssl rand -hex 32 產生>
JWT_EXPIRES_IN=7d

# SMTP（shared fallback，per-user SMTP 由用戶自行設定）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="ClientRadar AI" <noreply@yourcompany.com>

# Server
PORT=4000

# CORS — 加入 UAT domain
CORS_ORIGIN=https://uat.clientradar-ai.com
```

### 3.5 Build + 啟動

```bash
cd ~/email_agent/cms/server
npm run build
npm run start:prod
```

驗證：
```bash
curl http://localhost:4000/api/health
# 預期: {"status":"success","data":{...}}
```

---

## 4. 機器 B — Worker + Hermes CLI

> 如果 Worker 同 Backend 喺同一台機，跳過 4.1，直接做 4.2。

### 4.1 設定 SSH 到機器 A（僅限分機部署）

```bash
# 喺機器 B 上
ssh-keygen -t ed25519 -C "worker-uat"
ssh-copy-id <user>@<機器A-IP>

# 測試
ssh <user>@<機器A-IP> 'echo ok'
```

### 4.2 Clone + 設定 Worker

```bash
cd ~
git clone <your-repo-url> email_agent
cd email_agent/cms/worker
npm install
```

建立 `.env`：
```bash
cp .env.example .env
```

編輯 `cms/worker/.env`：
```env
# MongoDB — 指向機器 A
MONGODB_URI=mongodb://clientradar:YOUR_STRONG_PASSWORD@<機器A-IP>:27017/lead_scraper?authSource=admin

# CMS API — 指向機器 A
API_URL=http://<機器A-IP>:4000/api

# Worker 登入帳號（需要先喺系統註冊此帳號）
AGENT_EMAIL=agent@yourcompany.com
AGENT_PASS=<agent-password>
AGENT_ID=WORKER-UAT-1

# 任務輪詢間隔
POLL_MS=2000
```

### 4.3 Hermes CLI 設定

參考 `docs/uat-deployment-runbook.md` 嘅第 4-5 節做 Hermes state 遷移。

核心要確保：
```bash
hermes --version          # CLI 已安裝
ls ~/.hermes/skills/      # Skills 已載入
hermes run "Reply ready"  # LLM API key 有效
```

### 4.4 Build + 啟動

```bash
cd ~/email_agent/cms/worker
npm run build
npm run leader
```

---

## 5. 機器 C — Frontend (nginx + subdomain)

### 5.1 Build Frontend

可以喺任何有 Node.js 嘅機器 build，然後將 `dist/` 傳到 Frontend Server。

```bash
cd email_agent/hermes-frontend

# 設定 API URL（指向 nginx 自身，由 nginx 反向代理到 Backend）
echo 'VITE_API_URL=/api' > .env.production

npm install
npm run build
# 產出 dist/ 目錄
```

### 5.2 傳送 dist/ 到 Frontend Server

```bash
# 方法 1: scp
scp -r dist/ <user>@<機器C-IP>:/var/www/clientradar/

# 方法 2: rsync（推薦，增量同步）
rsync -avz --delete dist/ <user>@<機器C-IP>:/var/www/clientradar/
```

### 5.3 nginx 設定

建立 nginx config：

**macOS** (`/usr/local/etc/nginx/servers/clientradar.conf` 或 `/opt/homebrew/etc/nginx/servers/clientradar.conf`):

**Linux** (`/etc/nginx/sites-available/clientradar.conf`):

```nginx
server {
    listen 80;
    server_name uat.clientradar-ai.com;

    # HTTP → HTTPS redirect
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name uat.clientradar-ai.com;

    # SSL 證書路徑（見 §6）
    ssl_certificate     /etc/ssl/clientradar/fullchain.pem;
    ssl_certificate_key /etc/ssl/clientradar/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    # Frontend 靜態檔案
    root /var/www/clientradar;
    index index.html;

    # SPA fallback — 所有非檔案路徑都回 index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 反向代理到 Backend Mac
    location /api/ {
        proxy_pass http://<機器A-IP>:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # SSE 支援（Server-Sent Events）
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
    }

    # 靜態資源快取
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_min_length 1024;
}
```

**Linux 啟用 site:**
```bash
sudo ln -s /etc/nginx/sites-available/clientradar.conf /etc/nginx/sites-enabled/
sudo nginx -t          # 檢查語法
sudo systemctl reload nginx
```

**macOS 啟用:**
```bash
nginx -t
brew services restart nginx
```

---

## 6. DNS + SSL 設定

### 6.1 DNS A Record

喺公司 DNS 管理介面加：
```
類型: A
名稱: uat.clientradar-ai.com（或你嘅 subdomain）
值:   <機器C 嘅內網 IP>（如果只內網存取）
      <機器C 嘅公網 IP>（如果需要外網存取）
TTL:  300
```

如果係內部 DNS server（例如公司路由器嘅 DNS），加一條 A record 指向機器 C 嘅 LAN IP。

### 6.2 SSL 證書

**方案 A: Let's Encrypt（需要公網）**
```bash
sudo apt install certbot python3-certbot-nginx   # Linux
brew install certbot                               # macOS

sudo certbot --nginx -d uat.clientradar-ai.com
```

**方案 B: 自簽證書（純內網 UAT）**
```bash
mkdir -p /etc/ssl/clientradar
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/clientradar/privkey.pem \
  -out /etc/ssl/clientradar/fullchain.pem \
  -subj "/CN=uat.clientradar-ai.com"
```

> 自簽證書瀏覽器會顯示「不安全」警告，UAT 測試可以接受。

**方案 C: 公司內部 CA**

向 IT 部門申請，提供 CSR：
```bash
openssl req -new -newkey rsa:2048 -nodes \
  -keyout /etc/ssl/clientradar/privkey.pem \
  -out /etc/ssl/clientradar/clientradar.csr \
  -subj "/CN=uat.clientradar-ai.com"
```

將 CSR 交給 IT，收到證書後放入 `/etc/ssl/clientradar/fullchain.pem`。

### 6.3 純 HTTP 模式（最簡單，UAT 快速起步）

如果暫時唔想搞 SSL，可以只用 HTTP：

```nginx
server {
    listen 80;
    server_name uat.clientradar-ai.com;

    root /var/www/clientradar;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://<機器A-IP>:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_min_length 1024;
}
```

Frontend `.env.production` 改為 `VITE_API_URL=/api`，CORS_ORIGIN 改為 `http://uat.clientradar-ai.com`。

---

## 7. CORS 設定

Backend `cms/server/.env` 嘅 `CORS_ORIGIN` 必須包含 Frontend 嘅完整 origin：

```env
# HTTPS
CORS_ORIGIN=https://uat.clientradar-ai.com

# HTTP（如果用 §6.3 純 HTTP 模式）
CORS_ORIGIN=http://uat.clientradar-ai.com

# 多個 origin（逗號分隔）
CORS_ORIGIN=https://uat.clientradar-ai.com,http://localhost:5173
```

改完後重啟 Backend：
```bash
cd ~/email_agent/cms/server
npm run start:prod
```

---

## 8. 連通性驗證

### 8.1 逐層驗證 Checklist

```bash
# ── 1. 機器 A: MongoDB ──
mongosh --eval "db.runCommand({ ping: 1 })"
# 預期: { ok: 1 }

# ── 2. 機器 A: Backend ──
curl http://localhost:4000/api/health
# 預期: {"status":"success",...}

# ── 3. 機器 B → 機器 A: Worker 連到 API ──
curl http://<機器A-IP>:4000/api/health
# 預期: {"status":"success",...}

# ── 4. 機器 B → 機器 A: Worker 連到 MongoDB ──
mongosh "mongodb://clientradar:PASSWORD@<機器A-IP>:27017/lead_scraper?authSource=admin" --eval "db.runCommand({ ping: 1 })"
# 預期: { ok: 1 }

# ── 5. 機器 C: nginx ──
curl -I http://uat.clientradar-ai.com
# 預期: HTTP/1.1 200 OK（或 301 redirect to HTTPS）

# ── 6. 機器 C → 機器 A: API 反向代理 ──
curl http://uat.clientradar-ai.com/api/health
# 預期: {"status":"success",...}

# ── 7. 瀏覽器測試 ──
# 開 https://uat.clientradar-ai.com
# 預期: 見到 Login 頁面
# 登入後: 見到 Leads 頁面
```

### 8.2 macOS 防火牆

確保機器 A 嘅 4000 port 同 27017 port 允許內網存取：

```bash
# 檢查防火牆狀態
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate

# 如果開咗，確保 node 同 mongod 允許傳入連線
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/mongod
```

---

## 9. Process 管理 (launchd / pm2)

UAT 環境需要 process 喺重啟後自動恢復。

### 方案 A: pm2（推薦，跨平台）

```bash
npm install -g pm2
```

**機器 A — Backend:**
```bash
cd ~/email_agent/cms/server
pm2 start dist/main.js --name "clientradar-api" --env production
pm2 save
pm2 startup    # 跟住佢嘅指示設定開機自啟
```

**機器 B — Worker:**
```bash
cd ~/email_agent/cms/worker
pm2 start dist/leader.js --name "clientradar-worker" --env-file .env
pm2 save
pm2 startup
```

常用指令：
```bash
pm2 list              # 查看所有 process
pm2 logs              # 查看即時 log
pm2 restart all        # 重啟所有
pm2 monit             # 即時監控 CPU/RAM
```

### 方案 B: macOS launchd

建立 `~/Library/LaunchAgents/com.clientradar.api.plist`：
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.clientradar.api</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/Users/YOUR_USER/email_agent/cms/server/dist/main.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/Users/YOUR_USER/email_agent/cms/server</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>NODE_ENV</key>
        <string>production</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/clientradar-api.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/clientradar-api-error.log</string>
</dict>
</plist>
```

```bash
launchctl load ~/Library/LaunchAgents/com.clientradar.api.plist
```

---

## 10. 常見問題排查

| 症狀 | 原因 | 解法 |
|------|------|------|
| 瀏覽器白頁 | nginx root 路徑錯 / dist/ 未上傳 | 檢查 `ls /var/www/clientradar/index.html` |
| API 回 502 Bad Gateway | Backend 未啟動 / IP 錯 | 檢查 `curl http://<機器A-IP>:4000/api/health` |
| API 回 CORS error | CORS_ORIGIN 未設定 UAT domain | 編輯 Backend `.env` 加 origin，重啟 |
| Login 成功但頁面空白 | VITE_API_URL 設錯 | 應該係 `/api`（由 nginx proxy） |
| Worker 連唔到 API | 內網唔通 / 防火牆 | `ping <機器A-IP>` + 檢查 port 4000 |
| Worker 連唔到 MongoDB | MongoDB 未 bind 內網 IP | 編輯 mongod.conf 嘅 bindIp |
| Hermes CLI 報錯 | API key 過期 / config 未遷移 | 參考 `uat-deployment-runbook.md` |
| SSE 斷線 | nginx 嘅 proxy_buffering 未關 | 確認 nginx config 有 `proxy_buffering off` |
| 靜態資源 404 | nginx location 配置錯 | 確認 `try_files` 設定正確 |

---

## 附錄：快速參考

### 各組件啟動指令

| 組件 | 位置 | 啟動指令 |
|------|------|---------|
| MongoDB | 機器 A | `brew services start mongodb-community@7.0` |
| Backend | 機器 A | `cd cms/server && npm run start:prod` |
| Worker | 機器 B | `cd cms/worker && npm run start` |
| nginx | 機器 C | `sudo systemctl start nginx` / `brew services start nginx` |

### 各組件環境變數速查

| 變數 | 組件 | 說明 |
|------|------|------|
| `MONGODB_URI` | Backend, Worker | MongoDB connection string |
| `JWT_SECRET` | Backend | JWT 簽名密鑰（必須同一個） |
| `PORT` | Backend | API port（預設 4000） |
| `CORS_ORIGIN` | Backend | 允許嘅 frontend origin |
| `API_URL` | Worker | Backend API endpoint |
| `AGENT_EMAIL` / `AGENT_PASS` | Worker | Worker 登入帳號 |
| `VITE_API_URL` | Frontend build | API base URL（通常 `/api`） |

---

**相關文件**:
- `docs/uat-deployment-runbook.md` — Hermes CLI 跨機遷移
- `docs/uat-functional-spec.md` — 系統功能規格
- `setup.sh` — 本機開發環境一鍵設定
