'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

const FEATURES = [
  '真正 P2P - 通过 WebRTC 直接传输',
  '零服务器存储 - 无数据库或日志',
  '仅内存存储 - 关闭标签即清除',
  '无账户 - 无需手机或邮箱',
  '自动销毁 - 自动删除消息',
  '开源 - 代码完全可审计',
  '端到端加密 - WebRTC DTLS/SRTP',
  '临时身份 - 随机 peer ID',
  '连接指纹 - 验证无中间人',
  'P2P 文件传输 - 直接传输最大 10MB',
  '分块传输 - 可靠的 64KB 分块',
  '图片预览 - 内联显示',
  '元数据剥离 - EXIF 移除',
  '紧急按钮 - 清除全部 (Ctrl+Shift+X)',
  '消息限制 - 自动清理选项',
  '会话超时 - 自动断开',
  '屏幕模糊 - 切换标签时自动模糊',
  '无追踪 - 零分析或遥测',
  'PWA 支持 - 安装为应用',
  'Markdown 支持 - 16 种格式',
  '快捷表情 - 15 个一键按钮',
  '消息搜索 - 实时过滤',
  '复制保护 - 自动清除剪贴板',
  '已读回执 - 投递状态',
  '输入指示 - 显示正在输入',
  '消息删除 - 双向删除',
  '上传进度 - 实时进度条',
  '敏感信息模糊 - 自动检测密码',
  '反取证 - 内存覆盖',
  '自动清除 - 关闭时数据清除',
  '零成本 - Cloudflare Workers',
  '自动备用 - 多服务器',
];

export function CyclingFeatures() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % FEATURES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ minHeight: 60, marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: '0 10px' }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          style={{
            fontSize: 'clamp(12px, 3vw, 16px)',
            opacity: 0.85,
            fontWeight: 500,
            cursor: 'default',
            textAlign: 'center',
            position: 'absolute',
            width: '100%',
            maxWidth: '95%',
            lineHeight: 1.4,
          }}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {FEATURES[index].split('').map((char, i) => (
            <motion.span
              key={i}
              style={{ display: 'inline' }}
              variants={{
                hidden: { opacity: 1 },
                visible: {
                  opacity: 1,
                  transition: {
                    duration: 0.1,
                    delay: (FEATURES[index].length - 1 - i) * 0.015
                  }
                },
                exit: {
                  opacity: 1,
                  transition: {
                    duration: 0.05,
                    delay: i * 0.008
                  }
                }
              }}
            >
              {char === ' ' ? '\u00A0' : char}
            </motion.span>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
