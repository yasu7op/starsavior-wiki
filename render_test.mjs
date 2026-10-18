// End-to-end render test: Markdown -> HTML (marked) -> load in real Chrome
// and assert embedded images actually load through the relative paths the
// wiki viewer will use.
import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';
import { chromium } from 'playwright';

const cases = [
  { path: 'wiki/キャラクター/リディア-レディーメイド・パピー.md', tables: 1, minLinks: 0 },
  { path: 'wiki/アルカナ/これが…服？-リディア.md', tables: 1, minLinks: 1 },
  { path: 'wiki/index.md', tables: 1, minLinks: 4 },
  { path: 'wiki/キャラクター/index.md', tables: 1, minLinks: 57 },
  { path: 'wiki/tier/キャラティア.md', tables: 5, minLinks: 57 },
  { path: 'wiki/tier/アルカナティア.md', tables: 5, minLinks: 52 },
];
const stripFrontmatter = (src) => src.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');

let fail = 0;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();

for (const c of cases) {
  const mdPath = c.path;
  const html = marked.parse(stripFrontmatter(fs.readFileSync(mdPath, 'utf8')));
  const out = path.join(path.dirname(mdPath), '_render_test.html');
  fs.writeFileSync(out, html, 'utf8');
  await page.goto('file:///' + path.resolve(out).split(path.sep).join('/'));
  await page.waitForTimeout(600);
  const res = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('img')];
    return {
      headings: [...document.querySelectorAll('h1,h2,h3')].map((h) => h.textContent.trim()).slice(0, 8),
      tables: document.querySelectorAll('table').length,
      imgCount: imgs.length,
      imgLoaded: imgs.filter((i) => i.naturalWidth > 0).length,
      imgBroken: imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.getAttribute('src')),
      localLinks: [...document.querySelectorAll('a')].map((a) => a.getAttribute('href')).filter((h) => h && !h.startsWith('http')),
    };
  });
  const ok = res.imgLoaded === res.imgCount && res.tables === c.tables && res.localLinks.length >= c.minLinks;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${mdPath}`);
  console.log(`  headings: ${res.headings.join(' | ')}`);
  console.log(`  tables: ${res.tables}, images: ${res.imgLoaded}/${res.imgCount} loaded ${res.imgBroken.length ? 'BROKEN: ' + res.imgBroken.join(',') : ''}`);
  console.log(`  content links: ${res.localLinks.length} (expect >= ${c.minLinks})`);
  if (!ok) fail++;
  fs.unlinkSync(out);
}
// --- rendered site (GitHub Pages output)
if (fs.existsSync('site/index.html')) {
  const siteCases = [
    { url: 'site/index.html', tables: 1, minLinks: 4 },
    { url: 'site/キャラクター/index.html', tables: 1, minLinks: 57 },
    { url: 'site/tier/キャラティア.html', tables: 5, minLinks: 57 },
    { url: 'site/tier/アルカナティア.html', tables: 5, minLinks: 52 },
  ];
  for (const c of siteCases) {
    await page.goto('file:///' + path.resolve(c.url).split(path.sep).join('/'));
    await page.waitForTimeout(300);
    const res = await page.evaluate(() => ({
      tables: document.querySelectorAll('table').length,
      links: document.querySelectorAll('main a').length,
      leftover: /\]\(|\.md"/.test(document.body.innerHTML),
    }));
    const siteOk = res.tables === c.tables && res.links >= c.minLinks && !res.leftover;
    console.log(`${siteOk ? 'PASS' : 'FAIL'} ${c.url} (tables ${res.tables}, content links ${res.links}, unrewritten-md ${res.leftover})`);
    if (!siteOk) fail++;
  }
  // real click-through: hub -> character list -> character page (portrait loads)
  await page.goto('file:///' + path.resolve('site/index.html').split(path.sep).join('/'));
  await page.click('nav a[href="キャラクター/index.html"]');
  await page.waitForTimeout(400);
  const atList = decodeURIComponent(page.url()).includes('キャラクター/index.html');
  await page.click('main a[href$=".html"]:not([href$="index.html"])');
  await page.waitForTimeout(700);
  const click = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('img')];
    return { imgs: imgs.length, loaded: imgs.filter((i) => i.naturalWidth > 0).length, h1: document.querySelector('h1')?.textContent || '' };
  });
  const navOk = atList && click.imgs > 0 && click.loaded === click.imgs;
  console.log(`${navOk ? 'PASS' : 'FAIL'} site click-through (hub→list→char page: h1="${click.h1}", images ${click.loaded}/${click.imgs})`);
  if (!navOk) fail++;
} else {
  console.log('SKIP site checks (run node build_site.mjs first)');
}
await browser.close();
console.log(fail === 0 ? 'RENDER TEST PASSED' : `${fail} RENDER TEST(S) FAILED`);
process.exit(fail ? 1 : 0);
