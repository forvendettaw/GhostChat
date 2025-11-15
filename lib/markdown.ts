function escapeHtml(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  return escaped.replace(/\n/g, '<br>');
}

export function parseMarkdown(text: string): string {
  let html = escapeHtml(text);
  
  html = html.replace(/^---$/gm, '<hr style="border: 1px solid #333; margin: 8px 0">');
  html = html.replace(/^# (.+)$/gm, '<strong style="font-size: 1.3em">$1</strong>');
  html = html.replace(/^## (.+)$/gm, '<strong style="font-size: 1.15em">$1</strong>');
  html = html.replace(/^### (.+)$/gm, '<strong style="font-size: 1.05em">$1</strong>');
  html = html.replace(/^> (.+)$/gm, '<span style="border-left: 3px solid #666; padding-left: 8px; opacity: 0.8">$1</span>');
  html = html.replace(/^- (.+)$/gm, '<span style="display: block">&bull; $1</span>');
  html = html.replace(/^\d+\. (.+)$/gm, '<span style="display: block">$&</span>');
  html = html.replace(/^\[x\] (.+)$/gm, '<span style="display: block">☑ $1</span>');
  html = html.replace(/^\[ \] (.+)$/gm, '<span style="display: block">☐ $1</span>');
  html = html.replace(/```([\s\S]+?)```/g, '<pre style="background: #222; color: #0f0; padding: 8px; border-radius: 4px; overflow-x: auto; font-family: monospace"><code>$1</code></pre>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
  html = html.replace(/__(.+?)__/g, '<u>$1</u>');
  html = html.replace(/==(.+?)==/g, '<mark style="background: #ff0; color: #000; padding: 2px">$1</mark>');
  html = html.replace(/\^(.+?)\^/g, '<sup>$1</sup>');
  html = html.replace(/~(.+?)~/g, '<sub>$1</sub>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/`(.+?)`/g, '<code style="background: #222; color: #0f0; padding: 2px 4px; border-radius: 3px; font-family: monospace">$1</code>');
  html = html.replace(/!\[(.+?)\]\((.+?)\)/g, '<img src="$2" alt="$1" style="max-width: 200px; border-radius: 4px">');
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color: inherit; text-decoration: underline">$1</a>');
  html = html.replace(/\|(.+?)\|/g, '<span style="border: 1px solid #333; padding: 2px 4px">$1</span>');
  html = html.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener" style="color: inherit; text-decoration: underline">$1</a>');
  
  return html;
}
