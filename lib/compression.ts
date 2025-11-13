export async function compressAsync(text: string): Promise<string> {
  if (text.length < 100) return text;
  
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const stream = new CompressionStream('gzip');
  const writer = stream.writable.getWriter();
  writer.write(data);
  writer.close();
  
  const buf = await new Response(stream.readable).arrayBuffer();
  const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
  return `GZIP:${b64}`;
}

export async function decompressAsync(text: string): Promise<string> {
  if (!text.startsWith('GZIP:')) return text;
  
  const b64 = text.slice(5);
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  
  const stream = new DecompressionStream('gzip');
  const writer = stream.writable.getWriter();
  writer.write(bytes);
  writer.close();
  
  return new Response(stream.readable).text();
}
