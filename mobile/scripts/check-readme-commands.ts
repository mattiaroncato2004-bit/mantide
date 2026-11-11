// The README's "Run it" block claims to run the same checks as CI: every command of the CI `check`
// job must be in it, so a fresh clone that follows the README does what CI does.
// Run: npx tsx scripts/check-readme-commands.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const repo = join(__dirname, '..', '..');
const ci = readFileSync(join(repo, '.github/workflows/ci.yml'), 'utf8');
const readme = readFileSync(join(repo, 'README.md'), 'utf8');

const checkJob = ci.slice(ci.indexOf('  check:'), ci.indexOf('  deploy-pages:'));
// `a || b` in CI is a fallback for the runner (b when a fails there): the README needs a.
const ciCommands = [...checkJob.matchAll(/^\s+(?:- )?run: (.+)$/gm)].map((m) => m[1].split(' || ')[0].trim());

const runIt = readme.slice(readme.indexOf('## Run it'));
const block = runIt.slice(runIt.indexOf('```sh') + 5, runIt.indexOf('```', runIt.indexOf('```sh') + 5));
const readmeCommands = block
  .split('\n')
  .map((line) => line.replace(/#.*$/, '').trim())
  .flatMap((line) => line.split('&&').map((c) => c.trim()))
  .filter(Boolean);

const missing = ciCommands.filter((c) => !readmeCommands.includes(c));
if (missing.length) {
  console.error(`README "Run it" is missing CI commands:\n${missing.join('\n')}`);
  process.exit(1);
}
console.log(`readme commands: ok (${ciCommands.length} CI commands)`);
