"use client";

import { useState } from "react";

interface ErrorHandlerProps {
  error: string | null;
}

export default function ErrorHandler({ error }: ErrorHandlerProps) {
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  if (!error) return null;

  const isPeerLeft = error.includes("Peer left") || error.includes("Peer Disconnected");
  const isTimeout = error.includes("超时") || error.includes("timeout");

  const runQuickDiagnostic = () => {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║         GhostChat 快速诊断                    ║');
    console.log('╚════════════════════════════════════════════════╝');

    // 网络环境
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

    console.log('\n📱 网络环境：');
    console.log(`   - 设备类型: ${isMobile ? '移动端' : '桌面端'}`);
    console.log(`   - 连接类型: ${conn?.type || 'unknown'}`);
    console.log(`   - 有效带宽: ${conn?.effectiveType || 'unknown'}`);

    // 调试信息
    if (typeof window !== 'undefined' && (window as any).getDebugInfo) {
      console.log('\n📋 连接日志：');
      (window as any).getDebugInfo().forEach((msg: string) => console.log(`   ${msg}`));
    }

    console.log('\n💡 建议：');
    if (isMobile) {
      console.log('   1. 关闭至少一台设备的 VPN');
      console.log('   2. 双方都使用 WiFi 网络');
      console.log('   3. 刷新页面重试');
      console.log('   4. 给连接 2 分钟时间完成 ICE 收集');
    } else {
      console.log('   1. 检查防火墙设置');
      console.log('   2. 尝试关闭 VPN');
      console.log('   3. 检查 TURN 服务器连接（控制台输入 testTURNServers()）');
    }

    // 测试 TURN 服务器
    if (typeof window !== 'undefined' && (window as any).testTURNServers) {
      console.log('\n🧪 开始测试 TURN 服务器...');
      (window as any).testTURNServers();
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        left: 20,
        right: 20,
        background: "#1a1a1a",
        border: "1px solid #f00",
        borderRadius: 8,
        padding: 16,
        zIndex: 1000,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "#f00",
          marginBottom: 8,
        }}
      >
        {isPeerLeft ? "对方已断开连接" : "连接失败"}
      </div>
      <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 12 }}>
        {error}
      </div>

      {isTimeout && (
        <button
          onClick={runQuickDiagnostic}
          style={{
            width: "100%",
            padding: 10,
            background: "#333",
            border: "1px solid #555",
            borderRadius: 6,
            color: "#fff",
            fontSize: 11,
            cursor: "pointer",
            marginBottom: isPeerLeft ? 12 : 0,
          }}
        >
          🔍 运行快速诊断（查看控制台）
        </button>
      )}

      {isPeerLeft && (
        <div style={{ fontSize: 10, opacity: 0.6 }}>
          2秒后返回首页...
        </div>
      )}

    </div>
  );
}
