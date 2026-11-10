// Fails if a screen still has visible text written in the code instead of going through t().
// Run: npx tsx scripts/check-ui-strings.ts
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const files = ['App.tsx', ...readdirSync(join(root, 'src/screens')).map((f) => `src/screens/${f}`)];

// Proper names are the same in every language.
const ALLOWED = new Set(['Mantide', 'Gemma 4']);

const RULES: [string, RegExp][] = [
  // Text between a JSX tag and its closing tag: <Text>Gallery</Text>, possibly over several lines.
  ['JSX text', />\s*([^<>{}=;()]*[A-Za-zÀ-ÿ]{3,}[^<>{}=;()]*?)\s*<\//g],
  ['literal accessibilityLabel', /accessibilityLabel="[^"]*[A-Za-zÀ-ÿ]{3,}[^"]*"/g],
  ['status or toast literal', /(?:setStatus|showToast)\(\s*['`][^'`]*[A-Za-zÀ-ÿ]{3,}/g],
  ['hard-coded locale', /'it-IT'|'en-US'|'en-GB'/g],
];

const problems: string[] = [];
for (const file of files) {
  const text = readFileSync(join(root, file), 'utf8');
  for (const [name, rule] of RULES) {
    for (const match of text.matchAll(rule)) {
      if (ALLOWED.has((match[1] ?? '').trim())) continue;
      const line = text.slice(0, match.index).split('\n').length;
      problems.push(`${file}:${line}  ${name}: ${match[0].replace(/\s+/g, ' ').slice(0, 80)}`);
    }
  }
}

if (problems.length) {
  console.error(`${problems.length} hard-coded strings:\n${problems.join('\n')}`);
  process.exit(1);
}
console.log(`ui strings: ok (${files.length} files)`);
