# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

GhostChat 是一个基于 WebRTC 的端到端加密 P2P 聊天应用。所有消息仅存储在内存中，关闭标签页后即消失，无服务器存储，无账户系统。

## 常用命令

```bash
# 开发
npm run dev          # 启动 Next.js 开发服务器 (端口 3000)

# 测试
npm test             # 运行 vitest 单元测试
npm run test:ui      # 运行 vitest UI
npm run test:e2e     # 运行 Playwright E2E 测试
npm run test:e2e:ui  # 运行 Playwright UI
npm run test:worker  # 运行 Cloudflare Worker 测试

# 构建
npm run build        # 构建静态导出到 /out 目录
npm start            # 启动生产服务器
./deploy.sh          # 部署到 Cloudflare Pages

# 部署 Cloudflare Worker
cd cloudflare-worker && npx wrangler deploy
```

## 核心架构

### P2P 连接层

**关键原则**: 应用使用双层 P2P 协议系统 - simple-peer (主要) + PeerJS (备用)，通过 `peer-protocol-manager.ts` 自动切换。

```
lib/peer-manager.ts          # 公共 API 入口点
  ↓
lib/peer-protocol-manager.ts # 协议选择器 (simple-peer → PeerJS 自动切换)
  ↓
  ├─ lib/peer-simplepeer.ts  # simple-peer + Cloudflare Worker 实现
  └─ lib/peer-peerjs.ts      # PeerJS 备用实现
```

**重要**: `peer-manager.ts` 是主要的公共接口。所有组件都应通过此文件访问 P2P 功能，而非直接调用特定协议实现。

### 组件架构

```
app/chat/page.tsx     # 聊天页面入口
  ↓
components/ChatCore.tsx  # 核心聊天逻辑 (状态管理、消息处理、连接协调)
  ├─ components/MessageList.tsx    # 消息渲染
  ├─ components/MessageInput.tsx   # 输入处理
  ├─ components/ConnectionStatus.tsx # 连接状态显示
  └─ components/InviteSection.tsx  # 邀请链接生成
```

### 核心库

- **lib/storage.ts** - 内存存储 (无 localStorage/IndexedDB)。删除消息时会覆盖内存内容 (安全特性)
- **lib/file-transfer.ts** - 文件分块传输 (64KB chunks)
- **lib/connection-fingerprint.ts** - 连接指纹 (4 emoji + 6位验证码) 用于 MITM 检测
- **lib/sensitive-content.ts** - 敏感内容检测 (密码、SSN、信用卡号自动模糊)
- **lib/metadata-stripper.ts** - 图片 EXIF 元数据剥离

### Cloudflare Worker 信令服务器

```
cloudflare-worker/index.js  # WebSocket 信令服务器
  - 使用 Durable Objects (PeerSession) 管理 WebSocket 连接
  - 仅用于 WebRTC SDP/ICE 候选交换，不存储消息
  - 部署: cd cloudflare-worker && npx wrangler deploy
```

## 消息协议

所有 P2P 消息都是 JSON 字符串（文件传输除外）：

```javascript
// 文本消息
{ type: "message", id: string, text: string, expiresAt?: number }

// 文件 (通过 file-transfer.ts 分块)
{ type: "file-chunk" | "file", ... }

// 控制消息
{ type: "delete", id: string }        // 删除消息
{ type: "mask", id: string }          // 消息过期
{ type: "read", id: string }          // 已读回执
{ type: "disconnect" }                // 断开连接
{ type: "panic" }                     // 紧急清除
{ type: "noise" }                     // 假流量 (流量混淆)
"__typing__"                          // 正在输入指示器
```

## 重要安全考虑

1. **永不使用持久化存储** - 消息仅存储在内存中 (`lib/storage.ts`)
2. **内存覆盖** - 删除消息时覆盖内存内容 (`overwriteMemory()`)
3. **无日志记录敏感信息** - peerId 在日志中仅显示前 8 个字符
4. **连接指纹验证** - 鼓励用户通过带外通道验证指纹
5. **CSP 头** - 在 `next.config.js` 中配置严格的安全头

## 测试 P2P 本地

1. 终端 1: `npm run dev`
2. 浏览器标签 1: `localhost:3000/chat` → "Create Room" → 复制邀请链接
3. 浏览器标签 2: 粘贴邀请链接
4. 消息通过 WebRTC P2P 同步

## 部署架构

```
Next.js 静站点 (Cloudflare Pages / Vercel / Netlify)
  ↕ (WebSocket 信令)
Cloudflare Worker (Durable Objects)
  ↕ (仅初始连接: SDP/ICE)
P2P WebRTC DataChannel (DTLS 加密)
```

**注意**: 信令服务器仅协助建立连接。一旦建立 P2P 连接，消息直接在用户之间流动，服务器不参与。
