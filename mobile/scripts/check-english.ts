// Fails if code, comments or scripts still contain Italian outside the Italian strings file.
// A word list, not a language detector: Italian words that never appear in English code.
// Run: npx tsx scripts/check-english.ts
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = join(__dirname, '..');
const ITALIAN = /\b(ha risposto|risposta|leggi|galleria|della|delle|nella|sulla|perché|questo|questa|ancora|tutte|foto di|visitat[aeio]|regioni|paesi|luogo|eventi)\b/i;
const SKIP = new Set(['node_modules', 'android', 'ios', 'dist-web', 'test-results', 'playwright-report', 'geo', 'demo']);

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (SKIP.has(name)) return [];
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(ts|tsx)$/.test(name) && !path.endsWith(join('i18n', 'it.ts')) ? [path] : [];
  });
}

const found: string[] = [];
for (const file of [join(root, 'App.tsx'), ...sources(join(root, 'src')), ...sources(join(root, 'scripts'))]) {
  if (file.endsWith('check-english.ts')) continue;
  const isTest = /scripts[/\\]test-/.test(file);
  readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    // Tests of the Italian strings legitimately assert Italian text.
    if (isTest && line.includes('assert')) return;
    if (ITALIAN.test(line)) found.push(`${relative(root, file)}:${i + 1}  ${line.trim().slice(0, 90)}`);
  });
}

if (found.length) {
  console.error(`${found.length} lines in Italian:\n${found.join('\n')}`);
  process.exit(1);
}
console.log('english: ok');
