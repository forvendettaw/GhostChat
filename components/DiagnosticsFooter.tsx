"use client";

import { getStats } from "@/lib/bandwidth-monitor";
import { getCurrentProtocol } from "@/lib/peer-protocol-manager";
import { getCurrentWorker } from "@/lib/cloudflare-workers-pool";

interface DiagnosticsFooterProps {
  connected: boolean;
  connecting: boolean;
  peerId: string;
  messageCount: number;
  queueLength: number;
  uptime: number;
  error: string | null;
  fallbackWarning: boolean;
}

export default function DiagnosticsFooter({
  connected,
  connecting,
  peerId,
  messageCount,
  queueLength,
  uptime,
  error,
  fallbackWarning,
}: DiagnosticsFooterProps) {
  const stats = getStats();
  const worker = getCurrentWorker();
  const serverName = worker.includes("teycir")
    ? "CF-1"
    : worker.includes("teycitek")
      ? "CF-2"
      : "PeerJS";

  return (
    <div
      style={{
        padding: "8px 12px",
        background: "#0a0a0a",
        borderTop: "1px solid #333",
        fontSize: 10,
        opacity: 0.8,
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
        gap: "6px 12px",
      }}
    >
      <span>
        状态:{" "}
        <span
          style={{
            color: connected ? "#0f0" : connecting ? "#ff0" : "#f00",
          }}
        >
          {connected ? "已连接" : connecting ? "连接中" : "未连接"}
        </span>
      </span>
      <span>协议: {getCurrentProtocol() || "..."}</span>
      <span>ID: {peerId ? peerId.slice(0, 8) : "..."}</span>
      <span>消息: {messageCount}</span>
      <span>队列: {queueLength}</span>
      <span>
        运行: {Math.floor(uptime / 60)}分 {uptime % 60}秒
      </span>
      <span>发送: {(stats.bytesSent / 1024).toFixed(1)}KB</span>
      <span>接收: {(stats.bytesReceived / 1024).toFixed(1)}KB</span>
      <span title={worker}>服务器: {serverName}</span>
      {error && (
        <span style={{ color: "#f00" }}>错误: {error.slice(0, 15)}...</span>
      )}
      {fallbackWarning && <span style={{ color: "#ff0" }}>备用服务器</span>}
    </div>
  );
}
