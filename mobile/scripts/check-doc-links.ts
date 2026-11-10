// Fails if a Markdown file in the repo links to a relative path that doesn't exist.
// Run: npx tsx scripts/check-doc-links.ts
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const repo = join(__dirname, '..', '..');
const SKIP = new Set(['node_modules', '.git', '.superpowers', 'android', 'ios', 'dist-web', 'test-results', 'playwright-report']);

function markdownFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (SKIP.has(name)) return [];
    if (statSync(path).isDirectory()) return markdownFiles(path);
    return name.endsWith('.md') ? [path] : [];
  });
}

const broken: string[] = [];
for (const file of markdownFiles(repo)) {
  // Code blocks and inline code show example links, not real ones.
  const text = readFileSync(file, 'utf8').replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
  for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    const path = join(dirname(file), decodeURIComponent(target.split('#')[0]));
    if (!existsSync(path)) broken.push(`${relative(repo, file)} → ${target}`);
  }
}

if (broken.length) {
  console.error(`${broken.length} broken links:\n${broken.join('\n')}`);
  process.exit(1);
}
console.log('doc links: ok');
