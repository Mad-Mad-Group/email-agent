/**
 * PM2 Ecosystem Config — ClientRadar CMS
 *
 * 用法:
 *   pm2 start ecosystem.config.js          # 啟動所有服務
 *   pm2 start ecosystem.config.js --only cms-server
 *   pm2 start ecosystem.config.js --only cms-worker
 *   pm2 logs                                # 查看即時日誌
 *   pm2 status                              # 查看服務狀態
 *   pm2 restart all                         # 重啟所有
 *   pm2 stop all                            # 停止所有
 *   pm2 delete all                          # 移除所有
 *
 * 首次部署:
 *   1. npm install -g pm2
 *   2. cd cms/server && npm run build
 *   3. cd cms/worker && npm run build
 *   4. pm2 start ecosystem.config.js
 *   5. pm2 save && pm2 startup              # 設定開機自動啟動
 */

module.exports = {
  apps: [
    {
      name: 'cms-server',
      cwd: './cms/server',
      script: 'dist/main.js',
      node_args: '--env-file=.env',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
      // 日誌
      error_file: '../../logs/server-error.log',
      out_file: '../../logs/server-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // 重啟策略
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 5000,
    },
    {
      name: 'cms-worker',
      cwd: './cms/worker',
      script: 'dist/leader.js',
      node_args: '--env-file=.env',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
      // 日誌
      error_file: '../../logs/worker-error.log',
      out_file: '../../logs/worker-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Worker 重啟間隔稍長
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 10000,
    },
  ],
};
