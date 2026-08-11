/**
 * Rename files inside originals/ to match content slug folders:
 *   {slug}.{ext}
 *   {slug}--{variant}.{ext}
 *
 * Drops redundant *_preview* masters (optimize emits .thumb.webp).
 * Run: node scripts/rename-to-slug.mjs
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGINALS = path.join(ROOT, 'originals');

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function extOf(name) {
  return path.extname(name).toLowerCase();
}

function baseOf(name) {
  return path.basename(name, path.extname(name));
}

/** folder slug = last path segment under gallery|blogposts|projects */
function folderSlug(relDirPosix) {
  const parts = relDirPosix.split('/').filter(Boolean);
  return parts[parts.length - 1] || '';
}

function isPreviewName(name) {
  const b = baseOf(name).toLowerCase();
  return b.endsWith('_preview') || b.includes('_preview_') || b.endsWith('-preview');
}

/**
 * Map one file → new basename (no ext) or null to delete.
 * @returns {string | null | undefined} new base, null=delete, undefined=no rule (error)
 */
function mapBase(relDir, name) {
  const slug = folderSlug(relDir);
  const ext = extOf(name);
  const base = baseOf(name);
  const lower = base.toLowerCase();

  // Drop hand-made previews — CI thumbs replace them.
  // Exception: only asset in folder is a preview → keep as main (handled per-folder below).
  if (isPreviewName(name) && !['building-taxanomy-collage_preview_large'].includes(lower)) {
    // keep preview_large for taxonomy (no full-res collage); drop ordinary _preview
    if (lower.endsWith('_preview') || /_preview$/i.test(base)) return null;
  }

  // ----- gallery -----
  if (relDir === 'gallery/dataset-ukraine-bloody-toll') {
    if (lower.startsWith('project-bloody-toll')) return slug;
  }

  if (relDir === 'gallery/project-parks-and-parkings') {
    return slug;
  }

  if (relDir === 'gallery/experiment-ridge-plot-ferghana-central-asia') {
    return slug;
  }

  if (relDir === 'gallery/hillshaded-romania') {
    return slug;
  }

  if (relDir === 'gallery/experiment-osm-building-taxonomy') {
    if (lower.includes('collage')) return slug;
    if (lower === 'dag') return `${slug}--dag`;
    if (ext === '.mp4') return slug;
  }

  if (relDir === 'gallery/experiment-timeline-kazakh-rulers') {
    if (lower.includes('dark')) return `${slug}--dark`;
    if (lower.includes('white')) return `${slug}--white`;
  }

  if (relDir === 'gallery/hillshaded-afghanistan') {
    if (ext === '.mp4') return slug;
    const m = base.match(/-(\d+)$/);
    if (m) return `${slug}--${m[1]}`;
  }

  if (relDir === 'gallery/hillshaded-road-network-baltic-states') {
    if (lower.includes('terrain') || lower.includes('hillshade')) return `${slug}--terrain`;
    if (lower.includes('road')) return `${slug}--roads`;
  }

  // LiDAR single-pair folders
  const lidarSimple = [
    'gallery/lidar-breckenridge-colorado',
    'gallery/lidar-downtown-cleveland-ohio',
    'gallery/lidar-downtown-columbus-ohio',
    'gallery/lidar-downtown-detroit-michigan',
    'gallery/lidar-downtown-seattle-washington',
    'gallery/lidar-miami-beach-florida',
    'gallery/lidar-msu-campus-michigan',
    'gallery/lidar-nordic-valley-ut',
  ];
  if (lidarSimple.includes(relDir)) return slug;

  if (relDir === 'gallery/lidar-central-sao-paulo-brazil') {
    if (/colored-smaller/i.test(base)) return `${slug}--colored-smaller`;
    let m = base.match(/city-center-brazil-bigger-(\d+)/i);
    if (m) return `${slug}--city-bigger-${m[1]}`;
    if (/city-center-brazil-bigger$/i.test(base) && ext === '.mp4') return `${slug}--bigger`;
    m = base.match(/brazil-bigger-(\d+)/i);
    if (m) return `${slug}--bigger-${m[1]}`;
    m = base.match(/brazil-colored-(\d+)/i);
    if (m) return `${slug}--colored-${m[1]}`;
  }

  // population: extract palette token
  if (relDir.startsWith('gallery/population-charts-')) {
    const palettes = ['coloredterrain', 'greywhite', 'plasma', 'white', 'hot', 'ice'];
    for (const p of palettes) {
      if (lower.endsWith(`-${p}`) || lower.includes(`-${p}_`)) return `${slug}--${p}`;
    }
  }

  // road networks indexed
  if (relDir.startsWith('gallery/road-network-chart-')) {
    if (ext === '.mp4') return slug;
    const m = base.match(/-(\d+)$/);
    if (m) return `${slug}--${m[1]}`;
    return slug;
  }

  // ----- projects -----
  if (relDir === 'projects/project-surnames-navigator-meta') {
    if (lower === 'dag') return `${slug}--dag`;
    if (lower === 'dag_hide-inputs') return `${slug}--dag-hide-inputs`;
    if (lower === 'pipeline-overview') return `${slug}--pipeline-overview`;
    if (lower === 'post-banner' || lower === 'post-banner 1') {
      return lower.includes('1') ? `${slug}--banner-1` : `${slug}--banner`;
    }
    if (lower === 'wordcloud_example') return `${slug}--wordcloud-example`;
  }

  // ----- blogposts: forenames -----
  if (relDir === 'blogposts/project-surnames/forenames') {
    if (lower === 'preview_collage') return `${slug}--collage`;
    const region = lower
      .replace(/-forenames_merged.*/, '')
      .replace(/_merged.*/, '');
    // Balkan-Peninsula-forenames_merged → balkan-peninsula
    const regionSlug = base
      .replace(/-forenames_merged.*/i, '')
      .replace(/_merged.*/i, '')
      .toLowerCase()
      .replace(/\s+/g, '-');
    if (ext === '.svg' || ext === '.jpeg' || ext === '.jpg') {
      if (lower.includes('merged')) return `${slug}--${regionSlug}-merged`;
    }
  }

  // ----- blogposts: viz-surnames-* -----
  if (relDir.includes('/viz-surnames-')) {
    // country wordclouds: KAZ_wordcloud_tight.svg → slug--KAZ
    const iso = base.match(/^([A-Z]{2,3}|-99)(?:_wordcloud.*)?$/i);
    if (iso) {
      const code = iso[1] === '-99' ? 'XX' : iso[1].toUpperCase();
      return `${slug}--${code}`;
    }
    if (/merged_tight_rasters/i.test(base)) return `${slug}--merged-tight-rasters`;
    if (/_merged$/i.test(base) || /merged$/i.test(base.replace(/\s+/g, ''))) {
      return `${slug}--merged`;
    }
    // Baltic EST_wordcloud without _tight
    const iso2 = base.match(/^([A-Z]{3})_wordcloud/i);
    if (iso2) return `${slug}--${iso2[1].toUpperCase()}`;
    // surnames_central-asia_KAZ_1.png
    const extra = base.match(/_([A-Z]{3})_(\d+)$/i);
    if (extra) return `${slug}--${extra[1].toUpperCase()}-${extra[2]}`;
  }

  return undefined;
}

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '.DS_Store' || entry.name === 'Thumbs.db' || entry.name === 'README.md') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile()) yield full;
  }
}

async function main() {
  const plan = [];
  const unmatched = [];

  for await (const abs of walk(ORIGINALS)) {
    const rel = toPosix(path.relative(ORIGINALS, abs));
    const relDir = toPosix(path.dirname(rel));
    const name = path.basename(rel);
    const newBase = mapBase(relDir, name);

    if (newBase === undefined) {
      unmatched.push(rel);
      continue;
    }
    if (newBase === null) {
      plan.push({ kind: 'delete', abs, rel });
      continue;
    }

    const destName = `${newBase}${extOf(name)}`;
    const destRel = `${relDir}/${destName}`;
    if (destRel === rel) {
      plan.push({ kind: 'keep', rel });
      continue;
    }
    plan.push({
      kind: 'rename',
      abs,
      rel,
      destRel,
      absTo: path.join(ORIGINALS, destRel),
    });
  }

  if (unmatched.length) {
    console.error('Unmatched files:');
    for (const u of unmatched) console.error(' ', u);
    process.exit(1);
  }

  // detect collisions
  const targets = new Map();
  for (const p of plan) {
    if (p.kind !== 'rename' && p.kind !== 'keep') continue;
    const key = p.kind === 'keep' ? p.rel : p.destRel;
    if (!targets.has(key)) targets.set(key, []);
    targets.get(key).push(p.rel || key);
  }
  let collision = false;
  for (const [key, froms] of targets) {
    if (froms.length > 1) {
      console.error(`Collision on ${key}:`, froms);
      collision = true;
    }
  }
  if (collision) process.exit(1);

  let renamed = 0;
  let deleted = 0;
  let kept = 0;

  for (const p of plan) {
    if (p.kind === 'delete') {
      await fs.unlink(p.abs);
      deleted += 1;
      console.log(`del  ${p.rel}`);
    } else if (p.kind === 'keep') {
      kept += 1;
    } else if (p.kind === 'rename') {
      // two-phase via temp if needed — simple: rename to .tmp then final when clash with sibling
      const tmp = `${p.abs}.__renaming__`;
      await fs.rename(p.abs, tmp);
      p._tmp = tmp;
    }
  }

  for (const p of plan) {
    if (p.kind !== 'rename') continue;
    await fs.mkdir(path.dirname(p.absTo), { recursive: true });
    await fs.rename(p._tmp, p.absTo);
    renamed += 1;
    console.log(`mv   ${p.rel} → ${p.destRel}`);
  }

  console.log(`\nDone. renamed=${renamed} deleted=${deleted} kept=${kept}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
