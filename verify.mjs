// Verification: counts, JSON shape, markdown/image link integrity.
import fs from 'node:fs';
import path from 'node:path';

let fail = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) fail++; };

const chars = JSON.parse(fs.readFileSync('data/characters.json', 'utf8')).entries;
const arcs = JSON.parse(fs.readFileSync('data/arcanas.json', 'utf8')).entries;

ok(chars.length === 56, `characters.json count = ${chars.length} (expect 56)`);
ok(arcs.length === 81, `arcanas.json count = ${arcs.length} (expect 81)`);

// --- JSON shape checks
const badChar = chars.filter((c) => !c.name || !c.title || !c.rarity || !c.element || !c.className || !Array.isArray(c.skills) || c.skills.length === 0 || !c.portrait || !c.description);
ok(badChar.length === 0, `all characters have name/title/rarity/element/class/skills/portrait/description (bad: ${badChar.length}) ${badChar.slice(0, 3).map((c) => c.slug).join(',')}`);
const noDescSkill = chars.flatMap((c) => c.skills.filter((s) => !s.description || !s.name).map((s) => `${c.slug}/${s.name}`));
ok(noDescSkill.length === 0, `every skill has name+description (bad: ${noDescSkill.slice(0, 5).join(', ') || 'none'})`);
const skillCounts = [...new Set(chars.map((c) => c.skills.length))].sort();
console.log(`  info: skills per character = ${JSON.stringify(skillCounts)}`);
const elements = [...new Set(chars.map((c) => c.element))];
const classes = [...new Set(chars.map((c) => c.className))];
console.log(`  info: elements = ${elements.join('/')}; classes = ${classes.join('/')}`);
const badArc = arcs.filter((a) => !a.name || !a.characterName || !a.illustration || !a.rarity);
ok(badArc.length === 0, `all arcanas have name/character/illustration/rarity (bad: ${badArc.length}) ${badArc.slice(0, 3).map((a) => a.slug).join(',')}`);
const noStats = arcs.filter((a) => !a.stats || !a.stats.length);
ok(noStats.length === 0, `all arcanas have structured stats (bad: ${noStats.length})`);
const noJourney = arcs.filter((a) => !a.journeyText);
console.log(`  info: arcanas without journeyText = ${noJourney.length}`);

// --- markdown files exist
const mdChars = fs.readdirSync(path.join('wiki', 'キャラクター')).filter((f) => f.endsWith('.md') && f !== 'index.md');
const mdArcs = fs.readdirSync(path.join('wiki', 'アルカナ')).filter((f) => f.endsWith('.md') && f !== 'index.md');
ok(mdChars.length === 56, `wiki character pages = ${mdChars.length} (expect 56)`);
ok(mdArcs.length === 81, `wiki arcana pages = ${mdArcs.length} (expect 81)`);
const sectionIdx = ['wiki/キャラクター/index.md', 'wiki/アルカナ/index.md'];
const tierFiles = fs.existsSync('wiki/tier')
  ? fs.readdirSync('wiki/tier').filter((f) => f.endsWith('.md')).map((f) => path.join('wiki/tier', f))
  : [];
ok(fs.existsSync('wiki/index.md') && sectionIdx.every((f) => fs.existsSync(f)), 'top + section index pages exist');
ok(tierFiles.length === 2, `tier pages = ${tierFiles.length} (expect 2)`);

// --- link integrity: collect all links/images from all md files
const mdFiles = [
  ...mdChars.map((f) => path.join('wiki', 'キャラクター', f)),
  ...mdArcs.map((f) => path.join('wiki', 'アルカナ', f)),
  ...sectionIdx,
  ...tierFiles,
  'wiki/index.md',
];
const missingLinks = [];
const missingImgs = [];
for (const f of mdFiles) {
  const dir = path.dirname(f);
  const text = fs.readFileSync(f, 'utf8');
  for (const m of text.matchAll(/\]\(([^)]+)\)/g)) {
    let target = m[1];
    if (/^https?:/.test(target)) continue;
    target = decodeURIComponent(target);
    const resolved = path.resolve(dir, target);
    if (!fs.existsSync(resolved)) {
      if (target.endsWith('.md')) missingLinks.push(`${f} -> ${target}`);
      else missingImgs.push(`${f} -> ${target}`);
    }
  }
}
ok(missingLinks.length === 0, `all .md cross-links resolve (missing: ${missingLinks.length}) ${missingLinks.slice(0, 3).join(' | ')}`);
ok(missingImgs.length === 0, `all embedded images exist (missing: ${missingImgs.length}) ${missingImgs.slice(0, 3).join(' | ')}`);

// --- images on disk
const walkImgs = (d) => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walkImgs(path.join(d, e.name)) : [path.join(d, e.name)])) : [];
const imgs = walkImgs(path.join('wiki', 'images'));
const zeroByte = imgs.filter((f) => fs.statSync(f).size === 0);
ok(zeroByte.length === 0, `image files = ${imgs.length}, zero-byte = ${zeroByte.length}`);
const dupPrefix = imgs.filter((f) => f.split(path.sep).filter((p) => p === 'images').length > 1);
ok(dupPrefix.length === 0, `no images/images double path (found ${dupPrefix.length})`);

// --- section index rows count
const charIdxRows = (fs.readFileSync('wiki/キャラクター/index.md', 'utf8').match(/^\| \[/gm) || []).length;
const arcIdxRows = (fs.readFileSync('wiki/アルカナ/index.md', 'utf8').match(/^\| \[/gm) || []).length;
ok(charIdxRows === 56 && arcIdxRows === 81, `section index rows = ${charIdxRows}/${arcIdxRows} (expect 56/81)`);

// --- tier pages cover every character / ranked arcana exactly once
const tierText = tierFiles.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
const tierCharLinks = [...tierText.matchAll(/\]\(\.\.\/キャラクター\/([^)]+)\)/g)].map((m) => m[1]);
const tierArcLinks = [...tierText.matchAll(/\]\(\.\.\/アルカナ\/([^)]+)\)/g)].map((m) => m[1]);
ok(tierCharLinks.length === 56 && new Set(tierCharLinks).size === 56, `tier character links = ${tierCharLinks.length} (unique ${new Set(tierCharLinks).size}, expect 56/56)`);
ok(tierArcLinks.length === 51, `tier arcana links = ${tierArcLinks.length} (expect 51)`);

// --- provenance: no reference-site strings anywhere the repo would expose
// (needles are assembled at runtime so this file itself stays clean)
const NEEDLES = [['es', 'pr'], ['app', 'media']].map((a) => a.join(''));
const gitVisible = [
  'README.md', 'AGENTS.md', '.gitignore', 'package.json', 'package-lock.json',
  'verify.mjs', 'render_test.mjs', 'build_tier.mjs', 'build_site.mjs', '.github/workflows/pages.yml',
  'data/characters.json', 'data/arcanas.json',
  ...mdFiles,
];
const leaks = [];
for (const f of gitVisible) {
  if (!fs.existsSync(f)) continue;
  const text = fs.readFileSync(f, 'utf8').toLowerCase();
  if (NEEDLES.some((n) => text.includes(n))) leaks.push(f);
}
ok(leaks.length === 0, `no reference-site strings in repo-visible text files (leaks: ${leaks.length}) ${leaks.slice(0, 3).join(', ')}`);
const needleBufs = NEEDLES.flatMap((n) => [Buffer.from(n, 'latin1'), Buffer.from(n.toUpperCase(), 'latin1')]);
const imgLeaks = imgs.filter((f) => {
  const b = fs.readFileSync(f);
  return needleBufs.some((nb) => b.includes(nb));
});
ok(imgLeaks.length === 0, `no reference-site strings inside image binaries (leaks: ${imgLeaks.length}) ${imgLeaks.slice(0, 3).join(', ')}`);

// the built site is published even though it is gitignored — it must be clean too
if (fs.existsSync('site')) {
  const siteHtml = fs.readdirSync('site', { recursive: true })
    .filter((f) => f.endsWith('.html'))
    .map((f) => path.join('site', f));
  const siteLeaks = siteHtml.filter((f) => NEEDLES.some((n) => fs.readFileSync(f, 'utf8').toLowerCase().includes(n)));
  ok(siteLeaks.length === 0, `no reference-site strings in published site html (files ${siteHtml.length}, leaks: ${siteLeaks.length}) ${siteLeaks.slice(0, 3).join(', ')}`);
}

console.log(fail === 0 ? '\nALL CHECKS PASSED' : `\n${fail} CHECK(S) FAILED`);
process.exit(fail === 0 ? 0 : 1);
