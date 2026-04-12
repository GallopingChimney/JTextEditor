/**
 * Detect line ending style in a text string.
 * @param {string} text
 * @returns {'crlf'|'lf'|'cr'|'mixed'}
 */
export function detectLineEnding(text) {
  const crlf = (text.match(/\r\n/g) || []).length;
  const lf = (text.match(/(?<!\r)\n/g) || []).length;
  const cr = (text.match(/\r(?!\n)/g) || []).length;

  if (crlf && !lf && !cr) return 'crlf';
  if (lf && !crlf && !cr) return 'lf';
  if (cr && !crlf && !lf) return 'cr';
  if (crlf + lf + cr === 0) return 'lf'; // default for empty/single-line
  return 'mixed';
}

/**
 * Split text into lines, preserving awareness of line ending type.
 * @param {string} text
 * @returns {string[]}
 */
export function splitLines(text) {
  return text.split(/\r\n|\r|\n/);
}