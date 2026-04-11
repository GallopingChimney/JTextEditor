/**
 * Micro rich-text core — inspired by pell.js (~1KB).
 *
 * Pell's genius is that it does almost nothing:
 *   1. Create a div with contenteditable="true"
 *   2. Toolbar buttons call document.execCommand()
 *   3. The browser handles all selection, formatting, undo/redo
 *
 * We preserve that philosophy but wrap it for Svelte 5 consumption.
 * This module is the "kernel" — the Svelte components are the shell.
 *
 * NOTE: execCommand is technically deprecated but still universally supported
 * and is the only way to get free undo/redo with contenteditable.
 * When/if it breaks, we replace just this file.
 */

/**
 * Execute a formatting command on the current selection.
 * This is the entirety of pell's formatting engine.
 *
 * @param {string} command - An execCommand command name (e.g. 'bold', 'italic')
 * @param {string} [value] - Optional value (e.g. URL for createLink)
 * @returns {boolean}
 */
export function exec(command, value = null) {
  return document.execCommand(command, false, value);
}

/**
 * Query whether a formatting command is currently active on the selection.
 * @param {string} command
 * @returns {boolean}
 */
export function queryState(command) {
  return document.queryCommandState(command);
}

/**
 * Default actions for rich text mode toolbar.
 * Each action: { icon, title, command, value? }
 */
export const defaultActions = [
  { icon: '<b>B</b>', title: 'Bold', command: 'bold' },
  { icon: '<i>I</i>', title: 'Italic', command: 'italic' },
  { icon: '<u>U</u>', title: 'Underline', command: 'underline' },
  { icon: '<s>S</s>', title: 'Strikethrough', command: 'strikeThrough' },
  { icon: 'H1', title: 'Heading 1', command: 'formatBlock', value: '<h1>' },
  { icon: 'H2', title: 'Heading 2', command: 'formatBlock', value: '<h2>' },
  { icon: '&#8220;&#8221;', title: 'Quote', command: 'formatBlock', value: '<blockquote>' },
  { icon: '&#35;', title: 'Code', command: 'formatBlock', value: '<pre>' },
  { icon: '&#8226;', title: 'Unordered List', command: 'insertUnorderedList' },
  { icon: '&#35;.', title: 'Ordered List', command: 'insertOrderedList' },
  { icon: '&#128279;', title: 'Link', command: 'createLink' },
];
