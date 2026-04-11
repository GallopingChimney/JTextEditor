/**
 * Control character display mappings.
 * Maps code points to visible representations for "show all characters" mode.
 */

/** Unicode Control Pictures block (U+2400–U+2426) maps nicely to C0 controls */
const CONTROL_PICTURES = {
  0x00: '\u2400', // ␀ NULL
  0x01: '\u2401', // ␁ SOH
  0x02: '\u2402', // ␂ STX
  0x03: '\u2403', // ␃ ETX
  0x04: '\u2404', // ␄ EOT
  0x05: '\u2405', // ␅ ENQ
  0x06: '\u2406', // ␆ ACK
  0x07: '\u2407', // ␇ BEL
  0x08: '\u2408', // ␈ BS
  0x09: '\u2409', // ␉ HT (tab)
  0x0A: '\u240A', // ␊ LF
  0x0B: '\u240B', // ␋ VT
  0x0C: '\u240C', // ␌ FF
  0x0D: '\u240D', // ␍ CR
  0x0E: '\u240E', // ␎ SO
  0x0F: '\u240F', // ␏ SI
  0x10: '\u2410', // ␐ DLE
  0x11: '\u2411', // ␑ DC1
  0x12: '\u2412', // ␒ DC2
  0x13: '\u2413', // ␓ DC3
  0x14: '\u2414', // ␔ DC4
  0x15: '\u2415', // ␕ NAK
  0x16: '\u2416', // ␖ SYN
  0x17: '\u2417', // ␗ ETB
  0x18: '\u2418', // ␘ CAN
  0x19: '\u2419', // ␙ EM
  0x1A: '\u241A', // ␚ SUB
  0x1B: '\u241B', // ␛ ESC
  0x1C: '\u241C', // ␜ FS
  0x1D: '\u241D', // ␝ GS
  0x1E: '\u241E', // ␞ RS
  0x1F: '\u241F', // ␟ US
  0x7F: '\u2421', // ␡ DEL
  0x20: '\u2423', // ␣ SPACE (open box) — only used when showInvisibles is on
};

/**
 * Common whitespace/invisible characters beyond basic ASCII.
 * Shown as their Unicode name abbreviation in a distinct style.
 */
const EXTENDED_INVISIBLES = {
  0x85:   'NEL',    // Next Line
  0xA0:   'NBSP',   // No-Break Space
  0x1680: 'OGSP',   // Ogham Space Mark
  0x2000: 'NQSP',   // En Quad
  0x2001: 'MQSP',   // Em Quad
  0x2002: 'ENSP',   // En Space
  0x2003: 'EMSP',   // Em Space
  0x2004: '3/SP',   // Three-Per-Em Space
  0x2005: '4/SP',   // Four-Per-Em Space
  0x2006: '6/SP',   // Six-Per-Em Space
  0x2007: 'FSP',    // Figure Space
  0x2008: 'PSP',    // Punctuation Space
  0x2009: 'TSP',    // Thin Space
  0x200A: 'HSP',    // Hair Space
  0x200B: 'ZWSP',   // Zero Width Space
  0x200C: 'ZWNJ',   // Zero Width Non-Joiner
  0x200D: 'ZWJ',    // Zero Width Joiner
  0x2028: 'LS',     // Line Separator
  0x2029: 'PS',     // Paragraph Separator
  0x202F: 'NNBSP',  // Narrow No-Break Space
  0x205F: 'MMSP',   // Medium Mathematical Space
  0x2060: 'WJ',     // Word Joiner
  0x3000: 'IDSP',   // Ideographic Space
  0xFEFF: 'BOM',    // Byte Order Mark / Zero Width No-Break Space
};

/**
 * Annotate a line of text with visible representations of control/invisible characters.
 * Returns an array of segments: { text, type } where type is 'normal', 'control', or 'whitespace'.
 *
 * @param {string} line - A single line of text (no newline at end)
 * @param {object} options
 * @param {boolean} options.showWhitespace - Show spaces/tabs visibly
 * @param {boolean} options.showControls - Show control characters visibly
 * @returns {Array<{text: string, type: 'normal'|'control'|'whitespace'}>}
 */
export function segmentLine(line, { showWhitespace = true, showControls = true } = {}) {
  const segments = [];
  let normalBuf = '';

  const flush = () => {
    if (normalBuf) {
      segments.push({ text: normalBuf, type: 'normal' });
      normalBuf = '';
    }
  };

  for (let i = 0; i < line.length; i++) {
    const code = line.codePointAt(i);
    const ch = line[i];

    // Tab — keep actual \t so overlay aligns with textarea's tab-size
    if (code === 0x09 && showWhitespace) {
      flush();
      segments.push({ text: '\t', type: 'whitespace tab' });
      continue;
    }

    // Space — keep actual space, styled via CSS
    if (code === 0x20 && showWhitespace) {
      flush();
      segments.push({ text: ' ', type: 'whitespace space' });
      continue;
    }

    // C0 controls and DEL
    if (showControls && CONTROL_PICTURES[code] && code !== 0x09 && code !== 0x20) {
      flush();
      segments.push({ text: CONTROL_PICTURES[code], type: 'control' });
      continue;
    }

    // Extended invisibles
    if (showControls && EXTENDED_INVISIBLES[code]) {
      flush();
      segments.push({ text: `[${EXTENDED_INVISIBLES[code]}]`, type: 'control' });
      // Handle surrogate pairs for code points > 0xFFFF
      if (code > 0xFFFF) i++;
      continue;
    }

    normalBuf += ch;
  }

  flush();
  return segments;
}

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

/**
 * Line ending display labels.
 */
export const LINE_ENDING_LABELS = {
  crlf: 'CRLF',
  lf: 'LF',
  cr: 'CR',
  mixed: 'Mixed',
};
