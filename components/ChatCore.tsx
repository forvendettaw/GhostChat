"use client";

import React, { useEffect, useState } from "react";
import { getMessages, storeMessage, deleteMessage, maskMessage, markAsRead, setMaxMessages } from "@/lib/storage";
import {
  initPeer,
  connectToPeer,
  sendToAll,
  destroy,
} from "@/lib/peer-manager";
import { inviteManager } from "@/lib/invite-manager";
import { isMobile as checkIsMobile, requestWakeLock, ensureHTTPS } from "@/lib/mobile-utils";
import { checkRateLimit } from "@/lib/rate-limiter";
import { validateMessage } from "@/lib/input-validation";
import { getConnectionErrorMessage } from "@/lib/error-messages";
import { saveSession, clearSession } from "@/lib/session-recovery";
import {
  fileToBase64,
  deserializeFileMessage,
  serializeFileMessage,
} from "@/lib/file-transfer";
import { playNotificationSound, initAudioContext } from "@/lib/notification-sound";
import { containsSensitiveContent } from "@/lib/sensitive-content";
import { generateFingerprint } from "@/lib/connection-fingerprint";
import { stripImageMetadata } from "@/lib/metadata-stripper";

// Fallback UUID generator for iOS Chrome compatibility
const generateUUID = (): string => {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch (e) {
    console.warn('[UUID] crypto.randomUUID() not available, using fallback');
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};


import ErrorHandler from "./ErrorHandler";
import ConnectionStatus from "./ConnectionStatus";
import InviteSection from "./InviteSection";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import UploadProgress from "./UploadProgress";
import DiagnosticsFooter from "./DiagnosticsFooter";

interface ChatCoreProps {
  invitePeerId: string | null;
}

interface Message {
  id: string;
  text: string;
  peerId: string;
  isSelf: boolean;
  read?: boolean;
  expiresAt?: number;
  createdAt?: number;
  sensitive?: boolean;
  file?: {
    name: string;
    size: number;
    type: string;
    data: string;
  };
}

export default function ChatCore({ invitePeerId }: ChatCoreProps) {
  const [peerId, setPeerId] = useState("");
  const [messages, setMessages] = useState(getMessages());
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [messageQueue, setMessageQueue] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fallbackWarning, setFallbackWarning] = useState(false);
  const [uptime, setUptime] = useState(0);
  const [hasConnected, setHasConnected] = useState(false); // 跟踪是否曾经成功连接过
  const [uploadProgress, setUploadProgress] = useState<{
    fileName: string;
    sent: number;
    total: number;
  } | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [latency, setLatency] = useState<number | undefined>(undefined);
  const [selfDestructTimer, setSelfDestructTimer] = useState<number>(300);
  const [messageLimit, setMessageLimit] = useState<number>(50);
  const [remotePeerId, setRemotePeerId] = useState<string>("");
  const [fingerprint, setFingerprint] = useState<string>("");
  const [sessionTimeout, setSessionTimeout] = useState<number>(15);
  const [verificationCode, setVerificationCode] = useState<string>("");
  const [isMobileView, setIsMobileView] = useState(false);
  const [screenWidth, setScreenWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const initialized = React.useRef(false);
  const peerConnection = React.useRef<any>(null);
  const startTime = React.useRef(Date.now());
  const typingTimeout = React.useRef<NodeJS.Timeout | null>(null);
  const connectionTimeout = React.useRef<NodeJS.Timeout | null>(null);
  const inactivityTimeout = React.useRef<NodeJS.Timeout | null>(null);
  const lastActivity = React.useRef(Date.now());
  const typingDelayTimeout = React.useRef<NodeJS.Timeout | null>(null);
  const fakeTrafficInterval = React.useRef<NodeJS.Timeout | null>(null);
  const idleBlurTimeout = React.useRef<NodeJS.Timeout | null>(null);

  // 响应式检测
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setScreenWidth(width);
      setIsMobileView(width < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const uptimeInterval = setInterval(() => {
      setUptime(Math.floor((Date.now() - startTime.current) / 1000));
    }, 1000);

    if (initialized.current) return;
    initialized.current = true;

    (async () => {
      try {
        // WebRTC 能力检测
        const isWebRTCSupported = () => {
          const w = window as any;
          return !!(w.RTCPeerConnection || w.webkitRTCPeerConnection || w.mozRTCPeerConnection || w.RTCIceGatherer);
        };

        console.log('[WebRTC] Browser Support Check:');
        console.log('[WebRTC] - RTCPeerConnection:', !!(window as any).RTCPeerConnection);
        console.log('[WebRTC] - getUserMedia:', !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia));
        console.log('[WebRTC] - WebSocket:', !!window.WebSocket);
        console.log('[WebRTC] - User Agent:', navigator.userAgent);
        console.log('[WebRTC] - Platform:', navigator.platform);
        console.log('[WebRTC] - Supported:', isWebRTCSupported());

        if (!isWebRTCSupported()) {
          setError('您的浏览器不支持 WebRTC。请使用 Chrome、Firefox、Safari 或 Edge 最新版本。');
          return;
        }

        if (checkIsMobile()) {
          ensureHTTPS();
          requestWakeLock();
        }

        const handleMessage = (fromPeerId: string, data: string) => {
        if (data === "__typing__") {
          setIsTyping(true);
          if (typingTimeout.current) clearTimeout(typingTimeout.current);
          typingTimeout.current = setTimeout(() => setIsTyping(false), 3000);
          return;
        }
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === "delete") {
            deleteMessage(parsed.id);
            setMessages(getMessages().slice());
            return;
          }
          if (parsed.type === "mask") {
            maskMessage(parsed.id);
            setMessages(getMessages().slice());
            return;
          }
          if (parsed.type === "read") {
            markAsRead(parsed.id);
            setMessages(getMessages().slice());
            return;
          }
          if (parsed.type === "message") {
            const expiresAt = parsed.expiresAt ? parsed.expiresAt : undefined;
            const sensitive = containsSensitiveContent(parsed.text);
            storeMessage({ id: parsed.id, text: parsed.text, peerId: fromPeerId, isSelf: false, expiresAt, sensitive });
            setMessages(getMessages().slice());
            playNotificationSound();
            sendToAll(JSON.stringify({ type: "read", id: parsed.id }));
            return;
          }
          if (parsed.type === "disconnect") {
            handleDisconnect("Peer disconnected");
            return;
          }
          if (parsed.type === "panic") return;
          if (parsed.type === "noise") return;
          
          // Handle file chunks - don't return early!
          if (parsed.type === "file-chunk" || parsed.type === "file") {
            const fileData = deserializeFileMessage(data);
            if (fileData) {
              console.log(`[FILE] Received file: ${fileData.name}, size: ${fileData.size} bytes`);
              const id = generateUUID();
              storeMessage({ id, text: "", peerId: fromPeerId, isSelf: false, file: fileData });
              setMessages(getMessages().slice());
            }
            return;
          }
          
          // If we reach here with unknown type, ignore it
          return;
        } catch {
          // If JSON parsing fails, try deserializing as file
          const fileData = deserializeFileMessage(data);
          if (fileData) {
            console.log(`[FILE] Received file: ${fileData.name}, size: ${fileData.size} bytes`);
            const id = generateUUID();
            storeMessage({ id, text: "", peerId: fromPeerId, isSelf: false, file: fileData });
            setMessages(getMessages().slice());
          }
        }
        // Ignore any other non-JSON data (likely noise or malformed packets)
      };

      const handleConnect = (remote?: string, myPeerId?: string) => {
        console.log('[FINGERPRINT] handleConnect called with remote:', remote, 'myPeerId:', myPeerId);
        setConnected(true);
        setHasConnected(true); // 标记已成功连接过
        setConnecting(false);
        initAudioContext();
        if (connectionTimeout.current) {
          clearTimeout(connectionTimeout.current);
          connectionTimeout.current = null;
        }
        setMessageQueue((prev) => {
          prev.forEach((msg) => sendToAll(msg));
          return [];
        });
        const remotePeer = remote || invitePeerId || '';
        const localPeer = myPeerId || peerId;
        console.log('[FINGERPRINT] remotePeer:', remotePeer, 'localPeer:', localPeer);
        if (remotePeer && localPeer) {
          setRemotePeerId(remotePeer);
          const fp = generateFingerprint(localPeer, remotePeer);
          console.log('[FINGERPRINT] Generated:', fp);
          setFingerprint(fp);
          const code = String(Math.abs(fp.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 1000000)).padStart(6, '0');
          setVerificationCode(code);
        }
        startFakeTraffic();
      };

      const handleDisconnect = (reason?: string) => {
        setConnected(false);
        setConnecting(false);
        setLatency(undefined);
        peerConnection.current = null;

        // 只在曾经成功连接过的情况下才跳转回首页
        // 如果是初始连接失败，只显示错误消息
        if (hasConnected) {
          destroy();
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
        } else {
          destroy();
          // 初始连接失败，显示错误消息但不跳转
          setError(getConnectionErrorMessage({ type: reason || 'network-error' }));
        }
      };

      const handleFallback = () => {
        setFallbackWarning(true);
      };

      const peer = await initPeer(
        "",
        handleMessage,
        (remote?: string) => handleConnect(remote, peer?.id || ''),
        handleDisconnect,
        handleFallback,
      );

      if (peer && peer.id) {
        setPeerId(peer.id);
        saveSession(peer.id);
        const link = `${window.location.origin}/chat?peer=${peer.id}`;
        setInviteLink(link);

        if (invitePeerId) {
          setConnecting(true);
          const validPeerId = await inviteManager.validateInvite(invitePeerId);
          connectToPeer(
            validPeerId || invitePeerId,
            handleMessage,
            (remote?: string) => handleConnect(remote, peer.id),
            handleDisconnect,
          );

          // 移动端需要更长的连接超时时间
          // 注意：必须与 peer-simplepeer.ts:562 中的超时一致（120秒）
          const isMobile = checkIsMobile();
          const connectionTimeoutMs = isMobile ? 125000 : 50000; // 比 peer-simplepeer 多5秒缓冲

          connectionTimeout.current = setTimeout(() => {
            if (!connected) {
              setConnecting(false);
              setError(getConnectionErrorMessage({ type: "peer-unavailable" }));
            }
          }, connectionTimeoutMs);
        }
      }

      const handleVisibilityChange = () => {
        document.body.style.filter = document.hidden ? "blur(10px)" : "none";
      };
      document.addEventListener("visibilitychange", handleVisibilityChange);

      const latencyInterval = setInterval(() => {
        if (connected && peerConnection.current && peerConnection.current._pc) {
          peerConnection.current._pc.getStats().then((stats: any) => {
            stats.forEach((report: any) => {
              if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                setLatency(report.currentRoundTripTime ? Math.round(report.currentRoundTripTime * 1000) : undefined);
              }
            });
          }).catch(() => {});
        }
      }, 2000);

      const expiryInterval = setInterval(() => {
        const now = Date.now();
        const msgs = getMessages();
        let changed = false;
        msgs.forEach(msg => {
          if (msg.expiresAt && msg.expiresAt <= now) {
            maskMessage(msg.id);
            if (connected) sendToAll(JSON.stringify({ type: "mask", id: msg.id }));
            changed = true;
          }
        });
        if (changed) setMessages(getMessages().slice());
      }, 1000);

      const startFakeTraffic = () => {
        if (fakeTrafficInterval.current) clearInterval(fakeTrafficInterval.current);
        const sendNoise = () => {
          if (connected) {
            sendToAll(JSON.stringify({ type: "noise", data: Math.random().toString(36) }));
          }
          const delay = 3000 + Math.random() * 2000;
          fakeTrafficInterval.current = setTimeout(sendNoise, delay);
        };
        sendNoise();
      };

      const resetInactivity = () => {
        lastActivity.current = Date.now();
        document.body.style.filter = "none";
        if (inactivityTimeout.current) clearTimeout(inactivityTimeout.current);
        if (idleBlurTimeout.current) clearTimeout(idleBlurTimeout.current);
        if (connected && sessionTimeout > 0) {
          inactivityTimeout.current = setTimeout(() => {
            destroy();
            window.location.href = '/chat';
          }, sessionTimeout * 60000);
        }
        idleBlurTimeout.current = setTimeout(() => {
          document.body.style.filter = "blur(10px)";
        }, 30000);
      };

      const handlePanic = (e: KeyboardEvent) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'X') {
          e.preventDefault();
          getMessages().forEach(m => deleteMessage(m.id));
          setMessages([]);
        }
      };

      document.addEventListener('keydown', handlePanic);
      document.addEventListener('mousedown', resetInactivity);
      document.addEventListener('keydown', resetInactivity);
      resetInactivity();

      const handleBeforeUnload = () => {
        if (connected) {
          sendToAll(JSON.stringify({ type: "disconnect" }));
        }
      };
      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        if (connected) {
          sendToAll(JSON.stringify({ type: "disconnect" }));
        }
        clearInterval(uptimeInterval);
        clearInterval(latencyInterval);
        clearInterval(expiryInterval);
        if (inactivityTimeout.current) clearTimeout(inactivityTimeout.current);
        if (fakeTrafficInterval.current) clearTimeout(fakeTrafficInterval.current);
        if (idleBlurTimeout.current) clearTimeout(idleBlurTimeout.current);
        destroy();
        clearSession();
        window.removeEventListener('beforeunload', handleBeforeUnload);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        document.removeEventListener('keydown', handlePanic);
        document.removeEventListener('mousedown', resetInactivity);
        document.removeEventListener('keydown', resetInactivity);
      };
      } catch (err) {
        console.error('[INIT] Initialization error:', err);
        const errorMsg = err instanceof Error ? err.message : String(err);
        setError(`初始化失败: ${errorMsg}。请尝试刷新页面或使用其他浏览器。`);
      }
    })();
  }, []);



  const sendMessage = () => {
    if (!input.trim()) return;

    const validation = validateMessage(input);
    if (!validation.valid) {
      setError(validation.error || "Invalid message");
      return;
    }

    if (!checkRateLimit("messages", 10, 10000)) {
      setError("Sending too fast. Wait a moment.");
      return;
    }

    const id = generateUUID();
    const expiresAt = selfDestructTimer > 0 ? Date.now() + selfDestructTimer * 1000 : undefined;
    const sensitive = containsSensitiveContent(input);
    storeMessage({ id, text: input, peerId, isSelf: true, expiresAt, sensitive });
    setMessages(getMessages().slice());

    if (connected) {
      sendToAll(JSON.stringify({ type: "message", id, text: input, expiresAt }));
    } else {
      setMessageQueue((prev) => [...prev, JSON.stringify({ type: "message", id, text: input, expiresAt })]);
    }

    setInput("");
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let processedFile = file;
    if (file.type.startsWith('image/')) {
      try {
        const stripped = await stripImageMetadata(file);
        const blob = await fetch(stripped).then(r => r.blob());
        processedFile = new File([blob], file.name, { type: file.type });
      } catch (err) {
        console.error('[FILE] Metadata stripping failed:', err);
      }
    }

    const result = await fileToBase64(processedFile);
    if (!result.success) {
      setError(result.error || "Failed to process file");
      return;
    }

    const id = generateUUID();
    storeMessage({ id, text: "", peerId, isSelf: true, file: result.fileData });
    setMessages(getMessages().slice());

    const chunks = serializeFileMessage(result.fileData!);
    console.log(`[FILE] Sending ${file.name}: ${chunks.length} chunks, total size: ${result.fileData!.data.length} bytes`);

    if (connected) {
      setUploadProgress({ fileName: file.name, sent: 0, total: chunks.length });
      try {
        const sendChunks = async () => {
          for (let i = 0; i < chunks.length; i++) {
            console.log(`[FILE] Sending chunk ${i + 1}/${chunks.length}, size: ${chunks[i].length} bytes`);
            sendToAll(chunks[i]);
            setUploadProgress({
              fileName: file.name,
              sent: i + 1,
              total: chunks.length,
            });
            if (i < chunks.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 50));
            }
          }
          setTimeout(() => setUploadProgress(null), 2000);
        };
        sendChunks().catch(err => {
          console.error('[FILE] Send failed:', err);
          setError('Failed to send file. Try a smaller file.');
          setUploadProgress(null);
        });
      } catch (err) {
        console.error('[FILE] Send failed:', err);
        setError('Failed to send file. Try a smaller file.');
        setUploadProgress(null);
      }
    } else {
      setMessageQueue((prev) => [...prev, ...chunks]);
    }

    e.target.value = "";
  };

  // 响应式样式辅助函数
  const isMobile = screenWidth < 768;
  const isSmallMobile = screenWidth < 480;

  // 获取调试信息
  const getDebugMessages = () => {
    if (typeof window !== 'undefined' && (window as any).getDebugInfo) {
      return (window as any).getDebugInfo();
    }
    return [];
  };

  return (
    <div style={{ height: "100vh", width: "100%", maxWidth: "1400px", margin: "0 auto", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <ErrorHandler error={error} />

      {/* 调试信息面板 - 仅在未连接时显示 */}
      {!connected && !hasConnected && getDebugMessages().length > 0 && (
        <div style={{
          padding: isSmallMobile ? 8 : 12,
          background: "#1a1a2e",
          color: "#0f0",
          fontSize: isSmallMobile ? 9 : 10,
          fontFamily: "monospace",
          borderBottom: "1px solid #0f0",
          maxHeight: "200px",
          overflow: "auto"
        }}>
          <div style={{ marginBottom: 8, fontWeight: "bold", color: "#ff0" }}>
            🔍 连接诊断信息:
          </div>
          {getDebugMessages().map((msg: string, i: number) => (
            <div key={i} style={{ padding: "2px 0" }}>{msg}</div>
          ))}
        </div>
      )}
      {fallbackWarning && (
        <div
          style={{
            padding: isSmallMobile ? 8 : 12,
            background: "#ff0",
            color: "#000",
            fontSize: isSmallMobile ? 10 : 11,
            textAlign: "center",
            borderBottom: "1px solid #333",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: isSmallMobile ? 4 : 8,
          }}
        >
          <span>自定义服务器不可用，使用免费公共服务器 (0.peerjs.com)</span>
          <button
            onClick={() => setFallbackWarning(false)}
            style={{
              padding: isSmallMobile ? "6px 12px" : "8px 16px",
              background: "#000",
              color: "#ff0",
              border: "none",
              borderRadius: 4,
              fontSize: isSmallMobile ? 10 : 11,
              cursor: "pointer",
              minHeight: 36,
            }}
          >
            OK
          </button>
        </div>
      )}
      <div
        style={{
          padding: isSmallMobile ? 8 : 16,
          borderBottom: "1px solid #333",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: isSmallMobile ? 4 : 8,
          position: "relative",
        }}
      >
        <button
          onClick={() => window.location.href = '/'}
          style={{
            position: "absolute",
            left: isSmallMobile ? 8 : 16,
            top: isSmallMobile ? 8 : 16,
            background: "transparent",
            border: "none",
            color: "#fff",
            fontSize: isSmallMobile ? 20 : 24,
            cursor: "pointer",
            padding: isSmallMobile ? 6 : 8,
            display: "flex",
            alignItems: "center",
            fontWeight: 900,
            opacity: 0.8,
            minHeight: 44,
            minWidth: 44,
          }}
          title="返回首页"
        >
          ←
        </button>
        <div style={{ fontSize: isSmallMobile ? 9 : 11, opacity: 0.6, textAlign: "center" }}>
          你的 ID: {peerId.slice(0, 8)}...
        </div>
        <button
          onClick={() => {
            getMessages().forEach(m => deleteMessage(m.id));
            setMessages([]);
          }}
          style={{
            background: "linear-gradient(135deg, #fd0 0%, #fa0 100%)",
            color: "#000",
            border: "none",
            borderRadius: 6,
            padding: isSmallMobile ? "8px 14px" : "8px 20px",
            cursor: "pointer",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: isSmallMobile ? 4 : 6,
            minHeight: 44,
          }}
        >
          <span style={{ fontSize: isSmallMobile ? 14 : 16, display: 'inline-block', animation: 'pulse 2s ease-in-out infinite' }}>🚨</span>
          <span style={{ fontSize: 10 }}>清除全部</span>
        </button>
      </div>
      <div style={{ padding: isSmallMobile ? "6px 12px 12px" : "8px 16px 16px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <ConnectionStatus connected={connected} connecting={connecting} latency={latency} />
        {fingerprint && (
          <div style={{ marginTop: isSmallMobile ? 6 : 8, padding: isSmallMobile ? 6 : 8, background: "#1a1a1a", borderRadius: 6, fontSize: isSmallMobile ? 9 : 10, textAlign: "center", maxWidth: "100%" }}>
            <div style={{ marginBottom: isSmallMobile ? 4 : 6 }}>
              <span style={{ opacity: 0.6 }}>指纹: </span>
              <span style={{ fontSize: isSmallMobile ? 14 : 16, letterSpacing: isSmallMobile ? 1 : 2 }}>{fingerprint}</span>
            </div>
            <div>
              <span style={{ opacity: 0.6 }}>验证码: </span>
              <span style={{ fontSize: isSmallMobile ? 16 : 18, fontWeight: 700, letterSpacing: isSmallMobile ? 2 : 3, color: "#0f0" }}>{verificationCode}</span>
            </div>
            <div style={{ opacity: 0.5, fontSize: isSmallMobile ? 8 : 9, marginTop: isSmallMobile ? 3 : 4 }}>请验证对方看到相同代码</div>
          </div>
        )}
        <InviteSection
          peerId={peerId}
          inviteLink={inviteLink}
          connected={connected}
        />
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: isSmallMobile ? "8px 12px" : "16px 32px", width: "100%", maxWidth: "100vw", boxSizing: "border-box" }}>
        <MessageList
          messages={messages}
          onDelete={(id) => {
            deleteMessage(id);
            setMessages(getMessages().slice());
            if (connected) sendToAll(JSON.stringify({ type: "delete", id }));
          }}
        />
        {isTyping && (
          <div style={{ opacity: 0.6, fontSize: isSmallMobile ? 10 : 11, fontStyle: "italic" }}>
            对方正在输入...
          </div>
        )}
      </div>

      {uploadProgress && <UploadProgress {...uploadProgress} />}
      <div style={{ borderTop: "1px solid #333", padding: isSmallMobile ? "6px 12px" : "8px 16px", display: "flex", gap: isSmallMobile ? 8 : 12, alignItems: "center", flexWrap: "wrap", width: "100%", boxSizing: "border-box" }}>
        <div style={{ display: "flex", gap: isSmallMobile ? 4 : 6, alignItems: "center", flex: isSmallMobile ? "1 1 45%" : "0 1 auto" }}>
          <label className="tooltip-btn" data-title="自动删除时间" style={{ fontSize: isSmallMobile ? 9 : 10, opacity: 0.6, whiteSpace: "nowrap", cursor: "help" }}>{isMobile ? '自动删除:' : '自动删除:'}</label>
          <select
            value={selfDestructTimer}
            onChange={(e) => setSelfDestructTimer(Number(e.target.value))}
            style={{
              background: "#111",
              color: "#fff",
              border: "1px solid #333",
              borderRadius: 4,
              padding: isSmallMobile ? "8px 10px" : "4px 8px",
              fontSize: isSmallMobile ? 12 : 10,
              cursor: "pointer",
              minHeight: 40,
            }}
          >
            <option value={0}>从不</option>
            <option value={5}>5秒</option>
            <option value={30}>30秒</option>
            <option value={60}>1分钟</option>
            <option value={300}>5分钟</option>
          </select>
        </div>
        <div style={{ display: "flex", gap: isSmallMobile ? 4 : 6, alignItems: "center", flex: isSmallMobile ? "1 1 45%" : "0 1 auto" }}>
          <label className="tooltip-btn" data-title="保留最近N条消息" style={{ fontSize: isSmallMobile ? 9 : 10, opacity: 0.6, whiteSpace: "nowrap", cursor: "help" }}>{isMobile ? '最大:' : '最大消息数:'}</label>
          <select
            value={messageLimit}
            onChange={(e) => {
              const limit = Number(e.target.value);
              setMessageLimit(limit);
              setMaxMessages(limit);
              setMessages(getMessages().slice());
            }}
            style={{
              background: "#111",
              color: "#fff",
              border: "1px solid #333",
              borderRadius: 4,
              padding: isSmallMobile ? "8px 10px" : "4px 8px",
              fontSize: isSmallMobile ? 12 : 10,
              cursor: "pointer",
              minHeight: 40,
            }}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
        <div style={{ display: "flex", gap: isSmallMobile ? 4 : 6, alignItems: "center", flex: isSmallMobile ? "1 1 100%" : "0 1 auto" }}>
          <label className="tooltip-btn" data-title="无活动后自动断开" style={{ fontSize: isSmallMobile ? 9 : 10, opacity: 0.6, whiteSpace: "nowrap", cursor: "help" }}>{isMobile ? '超时:' : '会话超时:'}</label>
          <select
            value={sessionTimeout}
            onChange={(e) => setSessionTimeout(Number(e.target.value))}
            style={{
              background: "#111",
              color: "#fff",
              border: "1px solid #333",
              borderRadius: 4,
              padding: isSmallMobile ? "8px 10px" : "4px 8px",
              fontSize: isSmallMobile ? 12 : 10,
              cursor: "pointer",
              minHeight: 40,
            }}
          >
            <option value={0}>从不</option>
            <option value={5}>5分钟</option>
            <option value={15}>15分钟</option>
            <option value={30}>30分钟</option>
            <option value={60}>1小时</option>
          </select>
        </div>

      </div>
      <MessageInput
        input={input}
        setInput={setInput}
        connected={connected}
        onSend={sendMessage}
        onFileSelect={handleFileSelect}
        onTyping={() => {
          if (!connected) return;
          if (typingDelayTimeout.current) clearTimeout(typingDelayTimeout.current);
          typingDelayTimeout.current = setTimeout(() => {
            sendToAll("__typing__");
          }, Math.random() * 300);
        }}
      />
      <DiagnosticsFooter
        connected={connected}
        connecting={connecting}
        peerId={peerId}
        messageCount={messages.length}
        queueLength={messageQueue.length}
        uptime={uptime}
        error={error}
        fallbackWarning={fallbackWarning}
      />
    </div>
  );
}
