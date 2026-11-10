// The app's typography is Inter: fails if the hackathon fonts are still referenced.
// Run: npx tsx scripts/check-theme.ts
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = join(__dirname, '..');
const OLD = /Bricolage|IBMPlex/;

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

const found = [join(root, 'App.tsx'), ...sources(join(root, 'src'))].flatMap((file) =>
  readFileSync(file, 'utf8')
    .split('\n')
    .flatMap((line, i) => (OLD.test(line) ? [`${relative(root, file)}:${i + 1}  ${line.trim().slice(0, 80)}`] : [])),
);

if (found.length) {
  console.error(`${found.length} references to the old fonts:\n${found.join('\n')}`);
  process.exit(1);
}
console.log('theme: ok');
