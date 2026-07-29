/**
 * Convierte markdown básico a HTML seguro.
 * Soporta: **negritas**, *cursivas*, `código inline`
 * Escapa HTML para prevenir XSS.
 */
export function formatMarkdown(text) {
  if (!text) return '';

  // Escapar HTML para seguridad
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // **negritas**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // *cursivas* (solo si no es parte de negritas ya procesadas)
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');

  // `código inline`
  html = html.replace(/`(.+?)`/g, '<code class="bg-gray-200 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>');

  return html;
}
