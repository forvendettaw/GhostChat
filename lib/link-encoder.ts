export function encodeInviteLink(url: string): string {
  const base64 = btoa(url);
  const reversed = base64.split('').reverse().join('');
  const chunks = reversed.match(/.{1,4}/g) || [];
  return chunks.join('-');
}

export function decodeInviteLink(encoded: string): string | null {
  try {
    const reversed = encoded.replace(/-/g, '');
    const base64 = reversed.split('').reverse().join('');
    return atob(base64);
  } catch {
    return null;
  }
}

export function formatEncodedForEmail(encoded: string): string {
  return `GhostChat Invite Code:\n${encoded}\n\nPaste this code at: ${window.location.origin}/chat`;
}
