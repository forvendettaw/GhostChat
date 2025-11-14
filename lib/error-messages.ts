export function getConnectionErrorMessage(error: any): string {
  const errorType = error?.type || '';
  
  if (errorType === 'network') {
    return 'Network error. Check your internet connection and try again.';
  }
  
  if (errorType === 'peer-unavailable') {
    return 'Peer not found. They may have closed their tab. Ask them to create a new invite link.';
  }
  
  if (errorType === 'server-error') {
    return 'Signaling server error. Try refreshing the page or check Settings for custom server.';
  }
  
  if (errorType === 'browser-incompatible') {
    return 'Your browser does not support WebRTC. Try Chrome, Firefox, or Safari.';
  }
  
  if (errorType === 'ssl-required') {
    return 'HTTPS required for WebRTC. Use https:// or localhost.';
  }
  
  if (errorType === 'peer-left') {
    return 'Your friend closed their tab and left the chat.';
  }
  
  if (errorType === 'network-error') {
    return 'Network connection lost. Check your internet or try reconnecting.';
  }
  
  if (errorType === 'disconnected') {
    return 'Connection lost. Your friend may have closed their tab or lost internet.';
  }
  
  return 'Connection failed. Run Diagnostics for troubleshooting.';
}

export function getNetworkAdvice(scenario: string): string {
  switch (scenario) {
    case 'corporate':
      return 'Corporate firewall detected. WebRTC may be blocked. Try mobile hotspot or home network.';
    case 'mobile':
      return 'Mobile network detected. Connection may be unstable. Try WiFi for better reliability.';
    case 'vpn':
      return 'VPN detected. Some VPNs block WebRTC. Try disabling VPN temporarily.';
    default:
      return 'Connection issues detected. Check firewall settings or try different network.';
  }
}
