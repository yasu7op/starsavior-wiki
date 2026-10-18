// Generate wiki/tier pages from a tier snapshot + local data/*.json (offline).
// The snapshot below is plain game data only: names, ranks, attributes, tags.
import fs from 'node:fs';
import path from 'node:path';

const DATE = '2026-10-18';

// --- character tier snapshot: rank -> names (order preserved)
const CHAR_TIERS = [
  { rank: 'SSS', names: ['プロフェッサーM', 'アモラ', '水着スマイル', '花嫁カルメン', 'バニーシャルル', 'ドレスアセラ'] },
  { rank: 'SS', names: ['クリステル', '花嫁エピンデル', 'ティリア', 'フェイ', 'ロザリア', 'エミリー', 'バニークレア', 'ダーナ', 'エデ', 'クラリッサ'] },
  { rank: 'S', provisional: true, names: ['メイドリディア', 'グウェン', '水着ルナ', 'セレス', 'カネリア', 'リン', 'ロベルタ', 'バニーフレイ', 'キラ', 'レイシー', 'ルー', 'セイラ', 'シャルル', 'ルナ', 'スマイル', 'アンナ'] },
  { rank: 'A', names: ['ヒルデ', 'ヤナギ・ミナ', 'ベル・リース', 'バニースカーレット', 'ターニャ', 'リディア', 'セルパン', 'トリッシュ', 'スカーレット', 'クレア', 'ナル', 'ベラ', 'マルシル', 'ベスタ'] },
  { rank: 'B', names: ['リリー', 'ハーレー', 'エピンデル', 'エリサ', 'ミュリエル', 'フレイ', 'アセラ'] },
  { rank: 'C', names: ['オメガ', 'ペトラ', 'カルメン'] },
];

// character display name -> [element, class] (used to pick the exact unit)
const CHAR_META = {
  'プロフェッサーM': ['月', 'レンジャー'], 'アモラ': ['秩序', 'アサシン'], '水着スマイル': ['星', 'アサシン'],
  '花嫁カルメン': ['月', 'サポーター'], 'バニーシャルル': ['太陽', 'アサシン'], 'ドレスアセラ': ['秩序', 'サポーター'],
  'クリステル': ['太陽', 'レンジャー'], '花嫁エピンデル': ['太陽', 'キャスター'], 'ティリア': ['太陽', 'ストライカー'],
  'フェイ': ['月', 'アサシン'], 'ロザリア': ['混沌', 'レンジャー'], 'エミリー': ['月', 'ディフェンダー'],
  'バニークレア': ['月', 'ストライカー'], 'ダーナ': ['星', 'キャスター'], 'エデ': ['星', 'ディフェンダー'],
  'クラリッサ': ['星', 'レンジャー'], 'メイドリディア': ['月', 'キャスター'], 'グウェン': ['星', 'ストライカー'],
  '水着ルナ': ['太陽', 'ディフェンダー'], 'セレス': ['月', 'ストライカー'], 'カネリア': ['混沌', 'キャスター'],
  'リン': ['星', 'ストライカー'], 'ロベルタ': ['星', 'ストライカー'], 'バニーフレイ': ['月', 'キャスター'],
  'キラ': ['太陽', 'アサシン'], 'レイシー': ['混沌', 'レンジャー'], 'ルー': ['月', 'レンジャー'],
  'セイラ': ['秩序', 'ストライカー'], 'シャルル': ['太陽', 'ストライカー'], 'ルナ': ['秩序', 'キャスター'],
  'スマイル': ['星', 'レンジャー'], 'アンナ': ['太陽', 'ディフェンダー'], 'ヒルデ': ['太陽', 'ディフェンダー'],
  'ヤナギ・ミナ': ['星', 'レンジャー'], 'ベル・リース': ['星', 'レンジャー'], 'バニースカーレット': ['太陽', 'レンジャー'],
  'ターニャ': ['星', 'ストライカー'], 'リディア': ['混沌', 'レンジャー'], 'セルパン': ['太陽', 'サポーター'],
  'トリッシュ': ['星', 'アサシン'], 'スカーレット': ['太陽', 'ストライカー'], 'クレア': ['月', 'アサシン'],
  'ナル': ['星', 'レンジャー'], 'ベラ': ['月', 'サポーター'], 'マルシル': ['太陽', 'アサシン'],
  'ベスタ': ['星', 'ディフェンダー'], 'リリー': ['月', 'キャスター'], 'ハーレー': ['太陽', 'ディフェンダー'],
  'エピンデル': ['月', 'アサシン'], 'エリサ': ['混沌', 'サポーター'], 'ミュリエル': ['太陽', 'キャスター'],
  'フレイ': ['星', 'サポーター'], 'アセラ': ['月', 'ストライカー'], 'オメガ': ['星', 'キャスター'],
  'ペトラ': ['太陽', 'レンジャー'], 'カルメン': ['月', 'ディフェンダー'],
};

// --- arcana tier snapshot: rank -> names
const ARC_TIERS = [
  { rank: 'SS', names: ['花々に死を', '弱点補完カスタム特訓', '白い月のぬくもりは陽光のように', '不屈の傑作', '完璧なバニーガール', 'メイド・バイ・ペトラ♡'] },
  { rank: 'S', provisional: true, names: ['これが…服？', '享楽者の慰み', '帰路なき旅程', 'バカンスの準備はお買い物から！', '終末は少女の顔をしている', 'ストラニス家の令嬢', '星を見ながら夢を', 'キラくらい可愛い！', 'ノーペイン、ノーゲイン', 'ある騎士の誓い', '静かな休息時間'] },
  { rank: 'A', names: ['自称ベテラン探偵の捜査法', '永遠なる束縛の連鎖', '光を追え！', '服毒の覚悟', '死が二人を分かつまで', '気怠い午後の隙間', '今日の一歩', 'ノスタルジアの逆襲', '書類の山に積もる責任感', '虚数の開拓者', 'ボーン・トゥ・ビー・ワイルド', '天の審判', '楼閣の上、ガラスの月を迎えて'] },
  { rank: 'B', names: ['夏の夜の空', '歴戦の傭兵', '不器用な欲望の満たし方', '深い哀悼', 'アンダーカバー・コップ', '満足のいく食事', '天の試練', '姫、王位に就く'] },
  { rank: 'C', names: ['大胆かつ凄いバニーガール', '誰よりもプロフェッショナル', '真実はいつも一つでしょう？', '天ぷら名人', '見えない場所', '友達との散歩', 'ガラス越しの夜景'] },
  { rank: 'D', names: ['禁断の記録物Vol.1', 'ラビットタウン', '準備、照準、発射', '獲物選び', '幻影の蝶', '掃除、思いがけない客人'] },
];

// arcana display name -> ability tag (one of the 5 below)
const ARC_TAGS = {
  '花々に死を': '忍耐', '弱点補完カスタム特訓': '力', '白い月のぬくもりは陽光のように': '忍耐',
  '不屈の傑作': '力', '完璧なバニーガール': '体力', 'メイド・バイ・ペトラ♡': '集中',
  'これが…服？': '力', '享楽者の慰み': '忍耐', '帰路なき旅程': '体力',
  'バカンスの準備はお買い物から！': '力', '終末は少女の顔をしている': '力', 'ストラニス家の令嬢': '体力',
  '星を見ながら夢を': '集中', 'キラくらい可愛い！': '力', 'ノーペイン、ノーゲイン': '力',
  'ある騎士の誓い': '体力', '静かな休息時間': '体力',
  '自称ベテラン探偵の捜査法': '力', '永遠なる束縛の連鎖': '集中', '光を追え！': '力',
  '服毒の覚悟': '力', '死が二人を分かつまで': '力', '気怠い午後の隙間': '体力',
  '今日の一歩': '体力', 'ノスタルジアの逆襲': '忍耐', '書類の山に積もる責任感': '体力',
  '虚数の開拓者': '力', 'ボーン・トゥ・ビー・ワイルド': '忍耐', '天の審判': '力',
  '楼閣の上、ガラスの月を迎えて': '力',
  '夏の夜の空': '体力', '歴戦の傭兵': '体力', '不器用な欲望の満たし方': '力',
  '深い哀悼': '集中', 'アンダーカバー・コップ': '忍耐', '満足のいく食事': '保护',
  '天の試練': '忍耐', '姫、王位に就く': '体力',
  '大胆かつ凄いバニーガール': '力', '誰よりもプロフェッショナル': '体力', '真実はいつも一つでしょう？': '集中',
  '天ぷら名人': '保护', '見えない場所': '集中', '友達との散歩': '力', 'ガラス越しの夜景': '保护',
  '禁断の記録物Vol.1': '体力', 'ラビットタウン': '忍耐', '準備、照準、発射': '力',
  '獲物選び': '力', '幻影の蝶': '体力', '掃除、思いがけない客人': '力',
};

const ELEMENTS = ['太陽', '星', '月', '混沌', '秩序'];
const TAGS = ['力', '体力', '忍耐', '集中', '保护'];
const COSTUME_PREFIXES = ['水着', '花嫁', 'バニー', 'ドレス', 'メイド'];
const CHAR_RANKS = ['SSS', 'SS', 'S', 'A', 'B', 'C'];
const ARC_RANKS = ['SS', 'S', 'A', 'B', 'C', 'D'];

// --- helpers (must mirror scrape.mjs filename rules)
const sanitize = (s) => s.replace(/[\\/:*?"<>|]/g, '・').replace(/\s+/g, '').trim();
const norm = (s) => s.replace(/\s+/g, '');
const charFile = (c) => `${sanitize(c.name)}-${sanitize(c.title || c.slug)}.md`;
const arcFile = (a) => `${sanitize(a.name)}-${sanitize(a.characterName || a.slug)}.md`;

const chars = JSON.parse(fs.readFileSync('data/characters.json', 'utf8')).entries;
const arcs = JSON.parse(fs.readFileSync('data/arcanas.json', 'utf8')).entries;

const errors = [];

// --- resolve characters (costume display name -> exact unit via element+class)
const charSlot = new Map(); // slug -> { rank, ord }
CHAR_TIERS.forEach((t, ti) => {
  t.names.forEach((app, i) => {
    const meta = CHAR_META[app];
    if (!meta) { errors.push(`no meta for: ${app}`); return; }
    const root = COSTUME_PREFIXES.reduce((n, p) => (n.startsWith(p) ? n.slice(p.length) : n), app);
    const byName = chars.filter((c) => c.name === root);
    const cands = byName.filter((c) => c.element === meta[0] && c.className === meta[1]);
    if (cands.length !== 1) {
      errors.push(`char map FAIL: ${app} (root=${root}, meta=${meta.join('/')}) -> ${byName.map((c) => `${c.slug}[${c.element}/${c.className}]`).join(', ') || 'no name match'}`);
      return;
    }
    const c = cands[0];
    if (charSlot.has(c.slug)) errors.push(`char used twice: ${app} vs earlier`);
    charSlot.set(c.slug, { rank: t.rank, ord: ti * 100 + i });
  });
});
for (const c of chars) if (!charSlot.has(c.slug)) errors.push(`local char not tiered: ${c.name} - ${c.title}`);

// --- resolve arcanas (name -> tag)
const arcSlot = new Map(); // slug -> { rank, ord, tag }
ARC_TIERS.forEach((t, ti) => {
  t.names.forEach((app, i) => {
    const tag = ARC_TAGS[app];
    if (!tag) { errors.push(`no tag for: ${app}`); return; }
    const cands = arcs.filter((a) => norm(a.name) === norm(app));
    if (cands.length !== 1) {
      errors.push(`arc map FAIL: ${app} -> ${cands.length} candidates (${cands.map((a) => `${a.name} - ${a.characterName}`).join(' | ') || 'none'})`);
      return;
    }
    const a = cands[0];
    if (arcSlot.has(a.slug)) errors.push(`arcana used twice: ${app}`);
    arcSlot.set(a.slug, { rank: t.rank, ord: ti * 100 + i, tag });
  });
});

// --- link targets must exist on disk
for (const slug of charSlot.keys()) {
  const c = chars.find((x) => x.slug === slug);
  if (!fs.existsSync(path.join('wiki', 'キャラクター', charFile(c)))) errors.push(`missing char page: ${charFile(c)}`);
}
for (const slug of arcSlot.keys()) {
  const a = arcs.find((x) => x.slug === slug);
  if (!fs.existsSync(path.join('wiki', 'アルカナ', arcFile(a)))) errors.push(`missing arcana page: ${arcFile(a)}`);
}

if (errors.length) {
  console.error('BUILD TIER FAILED:');
  for (const e of errors) console.error(' - ' + e);
  process.exit(1);
}

// --- render: character tier by element
const rankLabel = (t) => (t.provisional ? `${t.rank}（暫定）` : t.rank);
const cLines = [
  '# キャラクターTier', '',
  '[トップへ戻る](../index.md)', '',
  `5属性別に整理（${DATE}時点。Sランクは暫定評価）`,
];
for (const el of ELEMENTS) {
  cLines.push('', `## ${el}属性`, '');
  cLines.push('| ランク | キャラクター |', '| --- | --- |');
  for (const rank of CHAR_RANKS) {
    const t = CHAR_TIERS.find((x) => x.rank === rank);
    const list = chars
      .filter((c) => c.element === el && charSlot.get(c.slug)?.rank === rank)
      .sort((a, b) => charSlot.get(a.slug).ord - charSlot.get(b.slug).ord);
    if (!list.length) continue;
    cLines.push(`| ${rankLabel(t)} | ${list.map((c) => `[${c.name}](../キャラクター/${charFile(c)})`).join('、')} |`);
  }
}
cLines.push('', '© Studio B-Side', '');

// --- render: arcana tier by ability tag
const aLines = [
  '# アルカナTier', '',
  '[トップへ戻る](../index.md)', '',
  `5属性（能力タグ）別に整理（${DATE}時点。Sランクは暫定評価）`,
];
for (const tag of TAGS) {
  aLines.push('', `## ${tag}`, '');
  aLines.push('| ランク | アルカナ |', '| --- | --- |');
  for (const rank of ARC_RANKS) {
    const t = ARC_TIERS.find((x) => x.rank === rank);
    const list = arcs
      .filter((a) => arcSlot.get(a.slug)?.tag === tag && arcSlot.get(a.slug)?.rank === rank)
      .sort((a, b) => arcSlot.get(a.slug).ord - arcSlot.get(b.slug).ord);
    if (!list.length) continue;
    aLines.push(`| ${rankLabel(t)} | ${list.map((a) => `[${a.name}](../アルカナ/${arcFile(a)})`).join('、')} |`);
  }
}
aLines.push('', '© Studio B-Side', '');

fs.mkdirSync('wiki/tier', { recursive: true });
fs.writeFileSync(path.join('wiki', 'tier', 'キャラティア.md'), cLines.join('\n'), 'utf8');
fs.writeFileSync(path.join('wiki', 'tier', 'アルカナティア.md'), aLines.join('\n'), 'utf8');

console.log(`tier pages written: characters ${charSlot.size}/${chars.length}, arcanas ${arcSlot.size} (of ${arcs.length} local)`);
console.log('elements:', ELEMENTS.map((e) => `${e}:${[...charSlot.keys()].filter((s) => chars.find((c) => c.slug === s).element === e).length}`).join(' '));
console.log('tags:', TAGS.map((t) => `${t}:${[...arcSlot.values()].filter((v) => v.tag === t).length}`).join(' '));
