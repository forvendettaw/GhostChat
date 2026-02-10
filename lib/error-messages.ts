export function getConnectionErrorMessage(error: any): string {
  const errorType = error?.type || "";

  if (errorType === "network") {
    return "Network error. Check your internet connection and try again.";
  }

  if (errorType === "peer-unavailable") {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      return "无法连接到对方。移动端连接可能需要更长时间（最多 45 秒）。请确保双方都在稳定的 WiFi 网络下。如果仍失败，请复制最新链接重试。";
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
      return "连接超时。移动端可能需要更长时间。建议：1) 双方都使用 WiFi；2) 如果使用 VPN 请尝试关闭；3) 刷新页面重试。";
    }
    return "Connection timeout. If using VPN, try disabling it and reconnect.";
  }

  if (errorType === "connection-failed") {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      return "连接失败。请确保：1) 双方都在同一页面；2) 网络连接稳定；3) 尝试刷新页面重新生成邀请链接。";
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
