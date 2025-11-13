export function generateQRCode(text: string): string {
  const size = 200;
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
  return qrApiUrl;
}

export function downloadQRCode(url: string, filename: string = 'ghostchat-invite.png') {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
}
