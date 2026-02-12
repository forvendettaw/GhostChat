export function getConnectionErrorMessage(error: any): string {
  const errorType = error?.type || "";

  if (errorType === "network") {
    return "Network error. Check your internet connection and try again.";
  }

  if (errorType === "peer-unavailable") {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      return "无法连接到对方。移动端连接可能需要更长时间（最多 2 分钟）。请确保双方都在稳定的 WiFi 网络下，关闭至少一方的 VPN。如果仍失败，请复制最新链接重试。";
    }
    return "Peer not found. They may have closed their tab. Ask them to create a new invite link.";
  }

  if (errorType === "server-error") {
    return "Signaling server error. Try refreshing the page or check Settings for custom server.";
  }

  if (errorType === "browser-incompatible") {
    return "Your browser does not support WebRTC. Try Chrome, Firefox, or Safari.";
  }

  if (errorType === "ssl-required") {
    return "HTTPS required for WebRTC. Use https:// or localhost.";
  }

  if (errorType === "peer-left") {
    return "Peer left the chat.";
  }

  if (errorType === "network-error") {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      return "移动端网络连接中断。请检查网络连接，建议使用 WiFi 而非移动数据。如果使用 VPN，请尝试关闭后重试。";
    }
    return "Network connection lost. Check your internet or try reconnecting. If using VPN, try disabling it.";
  }

  if (errorType === "disconnected") {
    return "Connection lost. Peer may have closed their tab or lost internet. If using VPN, it may have interrupted the connection.";
  }

  if (errorType === "connection-timeout") {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      return "连接超时（已等待 2 分钟）。\n\n移动端 + VPN 环境可能需要更长时间。\n\n建议操作：\n1. 🔄 刷新页面重试\n2. 📱 关闭至少一台手机的 VPN\n3. 🌐 使用 WiFi 而非移动数据\n4. ⏳ 给连接更多时间（最多 2 分钟）";
    }
    return "Connection timeout (waited 2 minutes).\n\nMobile + VPN may need more time.\n\nSuggestions:\n1. 🔄 Refresh page\n2. 📱 Disable VPN on at least one phone\n3. 🌐 Try WiFi instead of mobile data\n4. ⏳ Be patient (up to 2 minutes)";
  }

  if (errorType === "connection-failed") {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      return "P2P 连接失败。\n\n可能原因：\n• 双方 VPN 阻止了 TURN 连接\n• 防火墙阻止了 UDP/TCP 端口\n• 网络不稳定导致连接中断\n\n解决方案：\n1. 📱 关闭至少一台手机的 VPN\n2. 🌐 使用稳定的 WiFi 网络\n3. 🔄 刷新页面后重试\n4. ⏳ 给连接 2 分钟时间";
    }
    return "Connection failed. Please make sure both parties are on the same page and try refreshing.";
  }

  return "Connection failed. Check Diagnostics for details.";
}

export function getNetworkAdvice(scenario: string): string {
  switch (scenario) {
    case "corporate":
      return "Corporate firewall detected. WebRTC may be blocked. Try mobile hotspot or home network.";
    case "mobile":
      return "Mobile network detected. Connection may be unstable. Try WiFi for better reliability.";
    case "vpn":
      return "VPN detected. Some VPNs block WebRTC. Try disabling VPN temporarily.";
    default:
      return "Connection issues detected. Check firewall settings or try different network.";
  }
}
