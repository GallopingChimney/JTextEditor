export const languages = [
  ['', 'Plain Text'],
  ['bash', 'Bash'], ['c', 'C'], ['cpp', 'C++'], ['cs', 'C#'], ['css', 'CSS'],
  ['dart', 'Dart'], ['diff', 'Diff'], ['dockerfile', 'Docker'], ['go', 'Go'],
  ['html', 'HTML'], ['ini', 'INI'], ['java', 'Java'], ['js', 'JavaScript'],
  ['json', 'JSON'], ['kt', 'Kotlin'], ['lua', 'Lua'], ['md', 'Markdown'],
  ['pl', 'Perl'], ['php', 'PHP'], ['ps1', 'PowerShell'], ['py', 'Python'],
  ['r', 'R'], ['rb', 'Ruby'], ['rs', 'Rust'], ['scala', 'Scala'],
  ['sql', 'SQL'], ['swift', 'Swift'], ['toml', 'TOML'], ['ts', 'TypeScript'],
  ['xml', 'XML'], ['yaml', 'YAML'],
];

export function getLangLabel(lang) {
  return languages.find(([v]) => v === lang)?.[1] || 'Plain Text';
}
