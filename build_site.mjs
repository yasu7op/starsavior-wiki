// Convert wiki/**.md into a static HTML site under site/ (GitHub Pages artifact).
// - shared shell: top nav (トップ/キャラ/アルカナ/tier×2), dark theme, footer
// - YAML frontmatter stripped (used only for the page title)
// - relative links rewritten .md -> .html; images stay as relative files
import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';

const SRC = 'wiki';
const OUT = 'site';

const NAV = [
  ['index.html', 'トップ'],
  ['キャラクター/index.html', 'キャラクター'],
  ['アルカナ/index.html', 'アルカナ'],
  ['tier/キャラティア.html', 'キャラTier'],
  ['tier/アルカナティア.html', 'アルカナTier'],
];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function stripFrontmatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { body: src, title: null };
  const body = src.slice(m[0].length);
  const name = m[1].match(/^name:\s*"?(.*?)"?\s*$/m)?.[1];
  const title = m[1].match(/^title:\s*"?(.*?)"?\s*$/m)?.[1];
  return { body, title: name ? (title ? `${name} - ${title}` : name) : null };
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const mdFiles = fs.readdirSync(SRC, { recursive: true }).filter((f) => f.endsWith('.md'));
let count = 0;
for (const rel of mdFiles) {
  const { body, title: fmTitle } = stripFrontmatter(fs.readFileSync(path.join(SRC, rel), 'utf8'));
  const bodyHtml = marked.parse(body).replace(/href="([^"]+)\.md"/g, 'href="$1.html"');
  const title = esc(fmTitle || body.match(/^#\s+(.+)$/m)?.[1] || path.basename(rel, '.md'));
  const outRel = rel.replace(/\.md$/, '.html');
  const depth = outRel.split(/[\\/]/).length - 1;
  const root = '../'.repeat(depth);
  const navHtml = NAV.map(([href, label]) => `<a href="${root}${href}">${esc(label)}</a>`).join('');
  const html = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
:root { color-scheme: dark; }
body { margin: 0; font-family: "Hiragino Sans", "Yu Gothic UI", "Noto Sans JP", system-ui, sans-serif; background: #0d1117; color: #e6edf3; line-height: 1.75; }
nav { position: sticky; top: 0; z-index: 10; display: flex; flex-wrap: wrap; gap: 4px 16px; padding: 10px 16px; background: #161b22; border-bottom: 1px solid #30363d; }
nav a { color: #58a6ff; text-decoration: none; font-weight: 600; }
nav a:hover { text-decoration: underline; }
main { max-width: 1000px; margin: 0 auto; padding: 20px 16px 64px; }
h1, h2, h3 { line-height: 1.4; }
table { border-collapse: collapse; width: 100%; margin: 12px 0; display: block; overflow-x: auto; }
th, td { border: 1px solid #30363d; padding: 6px 10px; text-align: left; vertical-align: top; }
th { background: #161b22; }
img { max-width: 100%; height: auto; border-radius: 8px; }
a { color: #58a6ff; }
footer { text-align: center; color: #8b949e; padding: 18px; border-top: 1px solid #30363d; }
code { background: #161b22; padding: 1px 5px; border-radius: 4px; }
</style>
</head>
<body>
<nav>${navHtml}</nav>
<main>
${bodyHtml}
</main>
<footer>© Studio B-Side</footer>
</body>
</html>
`;
  const outPath = path.join(OUT, outRel);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html, 'utf8');
  count++;
}
fs.cpSync(path.join(SRC, 'images'), path.join(OUT, 'images'), { recursive: true });
console.log(`site built: ${count} pages + images -> ${OUT}/`);
