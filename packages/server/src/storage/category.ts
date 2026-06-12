export type AssetCategory =
  | 'image' | 'video' | 'audio' | 'document' | 'code' | 'data' | 'other';

const MIME_PREFIXES: Array<[string, AssetCategory]> = [
  ['image/', 'image'],
  ['video/', 'video'],
  ['audio/', 'audio'],
  ['text/', 'document'],
  ['application/pdf', 'document'],
  ['application/json', 'data'],
  ['application/xml', 'data'],
  ['application/zip', 'data'],
];

export function detectCategory(mime: string, filename: string): AssetCategory {
  for (const [prefix, cat] of MIME_PREFIXES) {
    if (mime.startsWith(prefix)) return cat;
  }
  const ext = filename.toLowerCase().split('.').pop() ?? '';
  const codeExts = new Set(['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'go', 'rs', 'rb', 'php', 'sh', 'html', 'css', 'sql']);
  const docExts = new Set(['md', 'txt', 'docx', 'doc', 'rtf']);
  const dataExts = new Set(['csv', 'xlsx', 'xls', 'json', 'xml', 'yaml', 'yml', 'toml']);
  if (codeExts.has(ext)) return 'code';
  if (docExts.has(ext)) return 'document';
  if (dataExts.has(ext)) return 'data';
  return 'other';
}
