# GhostChat 部署指南

## 快速部署到 Cloudflare Pages + Workers

### 前置要求
- Cloudflare 账户（免费即可）
- Node.js 18+
- Wrangler CLI：`npm install -g wrangler`

### 步骤 1: 构建 Web 应用

```bash
cd /path/to/GhostChat
npm install
npm run build
```

构建完成后，静态文件在 `out/` 目录。

### 步骤 2: 部署到 Cloudflare Pages

```bash
npx wrangler pages deploy out --project-name=ghostchat
```

### 步骤 3: 部署 Cloudflare Worker（信令服务器）

```bash
cd cloudflare-worker
npx wrangler deploy
```

### 步骤 4: 配置自定义域名（可选）

1. 在 Cloudflare Pages 项目设置中添加自定义域名
2. 等待 SSL 证书生成

---

## 高级：部署多个 Worker（推荐）

为了提高可靠性，建议部署多个 Cloudflare Worker：

### 方法 1: 部署多个副本

```bash
# 部署第一个（主服务器）
npx wrangler deploy --name ghostchat-signaling

# 部署第二个（备用）
npx wrangler deploy --name ghostchat-signaling-2

# 部署第三个（备用）
npx wrangler deploy --name ghostchat-signaling-3
```

### 方法 2: 修改 wrangler.toml

为每个副本创建独立的配置：

```toml
# wrangler-main.toml
name = "ghostchat-signaling"
main = "index.js"
account_id = "your-account-id"

[[durable_objects.bindings]]
name = "PEER_SESSION"
class_name = "PeerSession"
```

```toml
# wrangler-backup.toml
name = "ghostchat-signaling-2"
main = "index.js"
account_id = "your-account-id"

[[durable_objects.bindings]]
name = "PEER_SESSION"
class_name = "PeerSession"
```

部署：

```bash
npx wrangler deploy --config wrangler-main.toml
npx wrangler deploy --config wrangler-backup.toml
```

### 步骤 5: 更新 Worker URL 列表

在 `lib/cloudflare-workers-pool.ts` 中添加你的 Worker URL：

```typescript
export const CLOUDFLARE_WORKERS = [
  'wss://ghostchat-signaling.your-subdomain.workers.dev/peerjs/peerjs',
  'wss://ghostchat-signaling-2.your-subdomain.workers.dev/peerjs/peerjs',
  'wss://ghostchat-signaling-3.your-subdomain.workers.dev/peerjs/peerjs',
];
```

---

## 自定义 TURN 服务器（可选）

为了提高连接成功率，可以部署自己的 TURN 服务器：

### 使用 coturn

```bash
# 安装 coturn
brew install coturn  # macOS
apt install coturn  # Ubuntu

# 配置
# /etc/turnserver.conf
listening-port=3478
fingerprint
lt-cred-mech
user=myusername:mypassword
realm=turn.yourdomain.com

# 启动
turnserver
```

然后在 `lib/turn-config.ts` 中添加：

```typescript
{
  urls: [
    'turn:turn.yourdomain.com:3478?transport=tcp',
    'turn:turn.yourdomain.com:3478',
  ],
  username: 'myusername',
  credential: 'mypassword',
  priority: 5  // 最高优先级
}
```

---

## 监控和调试

### 查看 Worker 日志

```bash
npx wrangler tail
```

### 测试 Worker 连接

```bash
# 测试单个 worker
node tests/cloudflare-worker/test-worker-websocket.js

# 测试多点连接
node tests/cloudflare-worker/test-worker-multi-peer.js
```

---

## 常见问题

### Q: 手机端无法连接

**解决方案：**
1. 确保 WebSocket 使用 `wss://`（TLS 加密）
2. 检查防火墙是否允许 WebSocket 连接
3. 尝试关闭 VPN（某些 VPN 会阻断 WebSocket）
4. 使用 4G/5G 而不是 WiFi

### Q: 连接经常断开

**解决方案：**
1. 部署多个 Cloudflare Worker 作为备用
2. 使用可靠的 TURN 服务器
3. 在移动端使用 HTTPS

### Q: TURN 服务器连接失败

**解决方案：**
1. 检查 TURN 服务器是否在线
2. 确认端口 3478 和 443 已开放
3. 测试 TURN 服务器：`turnutils_uclient -v -u username -w password turn-server.com`

---

## 安全建议

1. **始终使用 WSS**（WebSocket Secure）
2. **配置 TURN 认证**，不要使用匿名 TURN
3. **定期更新依赖**：`npm audit fix`
4. **监控 Worker 日志**，发现异常立即处理

---

## 成本估算

### Cloudflare 免费套餐

| 资源 | 限制 |
|------|------|
| Pages 请求数 | 100,000/天 |
| Workers 请求数 | 100,000/天 |
| Workers CPU 时间 | 10ms/请求 |
| Durable Objects | 免费（Beta） |

**GhostChat 估计使用量：**
- 每次连接 ~50 个信令消息
- 每分钟聊天 ~20 条消息
- 100 个用户/天 ≈ 10,000 请求

**结论**：免费套餐足够小型使用。

---

## 更新应用

更新代码后：

```bash
# 重新构建
npm run build

# 部署前端
npx wrangler pages deploy out --project-name=ghostchat

# 部署 Worker（如果修改了信令代码）
cd cloudflare-worker
npx wrangler deploy
```
