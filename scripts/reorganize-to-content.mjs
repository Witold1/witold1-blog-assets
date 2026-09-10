/**
 * Move assets/originals/ from legacy bucket folders into content/-aligned paths:
 *   gallery/<gallery-item-slug>/
 *   blogposts/<mdx-path-without-ext>/
 *   projects/<mdx-path-without-ext>/
 *
 * Run: node scripts/reorganize-to-content.mjs
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGINALS = path.join(ROOT, 'assets', 'originals');

/** @type {Array<{ from: string, to: string }>} exact relative path moves */
const EXACT = [];

/** Prefix rules: first match wins. `fromPrefix` is relative to assets/originals/ */
const RULES = [
  // --- gallery: LiDAR ---
  { fromPrefix: '3D-LiDAR-Charts/LiDAR-Breckenridge-', toDir: 'gallery/lidar-breckenridge-colorado' },
  { fromPrefix: 'LiDAR-Videos/LiDAR-Breckenridge-', toDir: 'gallery/lidar-breckenridge-colorado' },
  { fromPrefix: '3D-LiDAR-Charts/LiDAR-Cleveland-', toDir: 'gallery/lidar-downtown-cleveland-ohio' },
  { fromPrefix: 'LiDAR-Videos/LiDAR-Cleveland-', toDir: 'gallery/lidar-downtown-cleveland-ohio' },
  { fromPrefix: '3D-LiDAR-Charts/LiDAR-Columbus-', toDir: 'gallery/lidar-downtown-columbus-ohio' },
  { fromPrefix: 'LiDAR-Videos/LiDAR-Columbus-', toDir: 'gallery/lidar-downtown-columbus-ohio' },
  { fromPrefix: '3D-LiDAR-Charts/LiDAR-Detroit-', toDir: 'gallery/lidar-downtown-detroit-michigan' },
  { fromPrefix: 'LiDAR-Videos/LiDAR-Detroit-', toDir: 'gallery/lidar-downtown-detroit-michigan' },
  { fromPrefix: '3D-LiDAR-Charts/LiDAR-Seattle-', toDir: 'gallery/lidar-downtown-seattle-washington' },
  { fromPrefix: 'LiDAR-Videos/LiDAR-Seattle-', toDir: 'gallery/lidar-downtown-seattle-washington' },
  { fromPrefix: '3D-LiDAR-Charts/LiDAR-Miami-', toDir: 'gallery/lidar-miami-beach-florida' },
  { fromPrefix: 'LiDAR-Videos/LiDAR-Miami-', toDir: 'gallery/lidar-miami-beach-florida' },
  { fromPrefix: '3D-LiDAR-Charts/LiDAR-Michigan-State-', toDir: 'gallery/lidar-msu-campus-michigan' },
  { fromPrefix: 'LiDAR-Videos/LiDAR-Michigan-State-', toDir: 'gallery/lidar-msu-campus-michigan' },
  { fromPrefix: '3D-LiDAR-Charts/LiDAR-Nordic-', toDir: 'gallery/lidar-nordic-valley-ut' },
  { fromPrefix: 'LiDAR-Videos/LiDAR-Nordic-', toDir: 'gallery/lidar-nordic-valley-ut' },
  { fromPrefix: '3D-LiDAR-Charts/LiDAR-SaoPaulo-', toDir: 'gallery/lidar-central-sao-paulo-brazil' },
  { fromPrefix: 'LiDAR-Videos/LiDAR-SaoPaulo-', toDir: 'gallery/lidar-central-sao-paulo-brazil' },

  // --- gallery: geography / terrain ---
  { fromPrefix: 'Geography-Terrain/Ridge-Plot-Ferghana-', toDir: 'gallery/experiment-ridge-plot-ferghana-central-asia' },
  { fromPrefix: 'Geography-Terrain/TerrainHillshade-Afghanistan', toDir: 'gallery/hillshaded-afghanistan' },
  { fromPrefix: 'Geography-Terrain/TerrainHillshade-Romania', toDir: 'gallery/hillshaded-romania' },
  { fromPrefix: 'Geography-Terrain/TerrainHillshaded-BalticStates', toDir: 'gallery/hillshaded-road-network-baltic-states' },

  // --- gallery: population ---
  { fromPrefix: 'Population-Charts/Population-Central-Asia-', toDir: 'gallery/population-charts-central-asia' },
  { fromPrefix: 'Population-Charts/Population-Eastern-Asia-', toDir: 'gallery/population-charts-eastern-asia' },
  { fromPrefix: 'Population-Charts/Population-Southeast-Asia-', toDir: 'gallery/population-charts-southeast-asia' },
  { fromPrefix: 'Population-Charts/Population-Southern-Asia-', toDir: 'gallery/population-charts-southern-asia' },
  { fromPrefix: 'Population-Charts/Population-Western-Asia-', toDir: 'gallery/population-charts-western-asia' },
  { fromPrefix: 'Population-Charts/Population-All-Asia-', toDir: 'gallery/population-charts-asia' },
  { fromPrefix: 'Population-Charts/Population-Custom-Alternative-Asia-', toDir: 'gallery/population-charts-alternative-asia' },
  { fromPrefix: 'Population-Charts/Population-Custom-Eastern-Europe-', toDir: 'gallery/population-charts-eastern-europe' },
  { fromPrefix: 'Population-Charts/Population-All-South-America-', toDir: 'gallery/population-charts-south-america' },
  // not yet in content/gallery/items — same naming style for when you add YAML
  { fromPrefix: 'Population-Charts/Population-All-Africa-', toDir: 'gallery/population-charts-africa' },
  { fromPrefix: 'Population-Charts/Population-All-Caribbean-America-', toDir: 'gallery/population-charts-caribbean-america' },

  // --- gallery: road networks ---
  { fromPrefix: 'Road-Network-Charts/RoadNetwork-Central-Asia-', toDir: 'gallery/road-network-chart-central-asia' },
  { fromPrefix: 'Road-Network-Charts/RoadNetwork-Post-Yugoslavia-', toDir: 'gallery/road-network-chart-former-yugoslavia' },
  { fromPrefix: 'Road-Network-Charts/RoadNetwork-Northern-Africa-', toDir: 'gallery/road-network-chart-northern-africa-states' },
  { fromPrefix: 'Road-Network-Charts/RoadNetwork-Indian-Peninsula-', toDir: 'gallery/road-network-chart-indian-subcontinent' },
  { fromPrefix: 'Road-Network-Charts/RoadNetwork-Korean-Peninsula-', toDir: 'gallery/road-network-chart-south-koreas' },
  { fromPrefix: 'Road-Network-Charts/RoadNetwork-France', toDir: 'gallery/road-network-chart-european-france' },
  { fromPrefix: 'Road-Network-Charts/RoadNetwork-WesternRussia', toDir: 'gallery/road-network-chart-western-russia' },
  { fromPrefix: 'Road-Network-Charts/RoadNetwork-BalticStates', toDir: 'gallery/hillshaded-road-network-baltic-states' },

  // --- gallery + blog shared → gallery slug ---
  { fromPrefix: 'small-project-blood-tool/', toDir: 'gallery/dataset-ukraine-bloody-toll' },
  { fromPrefix: 'project-country-rulers/', toDir: 'gallery/experiment-timeline-kazakh-rulers' },
  { fromPrefix: 'small-project-building-taxonomy/', toDir: 'gallery/experiment-osm-building-taxonomy' },
  { fromPrefix: 'USA Parks and Parkings.gif', toDir: 'gallery/project-parks-and-parkings' },

  // --- blogposts: surnames (match content/blogposts/... slugs) ---
  { fromPrefix: 'Surnames-Charts/project-surnames-central-america/', toDir: 'blogposts/project-surnames/viz-surnames-central-america' },
  { fromPrefix: 'Surnames-Charts/project-surnames-central-asia/', toDir: 'blogposts/project-surnames/viz-surnames-central-asia' },
  { fromPrefix: 'Surnames-Charts/project-surnames-middle-east/', toDir: 'blogposts/project-surnames/viz-surnames-middle-east' },
  { fromPrefix: 'Surnames-Charts/project-forenames/', toDir: 'blogposts/project-surnames/forenames' },
  { fromPrefix: 'Surnames-Charts/Project-Surnames-Images/', toDir: 'blogposts/project-surnames/forenames' },
  // regions without MDX yet — same viz-surnames-* pattern
  { fromPrefix: 'Surnames-Charts/project-surnames-balkan-peninsula/', toDir: 'blogposts/project-surnames/viz-surnames-balkan-peninsula' },
  { fromPrefix: 'Surnames-Charts/project-surnames-baltic-states/', toDir: 'blogposts/project-surnames/viz-surnames-baltic-states' },
  { fromPrefix: 'Surnames-Charts/project-surnames-central-europe/', toDir: 'blogposts/project-surnames/viz-surnames-central-europe' },
  { fromPrefix: 'Surnames-Charts/project-surnames-iberian-peninsula/', toDir: 'blogposts/project-surnames/viz-surnames-iberian-peninsula' },
  { fromPrefix: 'Surnames-Charts/project-surnames-indian-subcontinent/', toDir: 'blogposts/project-surnames/viz-surnames-indian-subcontinent' },

  // --- projects ---
  { fromPrefix: 'Surnames-Charts/project-surnames-navigator/', toDir: 'projects/project-surnames-navigator-meta' },
];

function toPosix(p) {
  return p.split(path.sep).join('/');
}

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '.DS_Store' || entry.name === 'Thumbs.db') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile()) yield full;
  }
}

function resolveDest(relPosix) {
  if (relPosix === 'README.md') return null;
  for (const { from, to } of EXACT) {
    if (relPosix === from) return to;
  }
  for (const { fromPrefix, toDir } of RULES) {
    if (relPosix === fromPrefix || relPosix.startsWith(fromPrefix)) {
      const base = path.posix.basename(relPosix);
      return `${toDir}/${base}`;
    }
  }
  return null;
}

async function main() {
  const moves = [];
  const unmatched = [];

  for await (const abs of walk(ORIGINALS)) {
    const rel = toPosix(path.relative(ORIGINALS, abs));
    // skip files already under gallery/, blogposts/, projects/
    if (
      rel.startsWith('gallery/') ||
      rel.startsWith('blogposts/') ||
      rel.startsWith('projects/') ||
      rel === 'README.md'
    ) {
      continue;
    }
    const dest = resolveDest(rel);
    if (!dest) {
      unmatched.push(rel);
      continue;
    }
    moves.push({ from: rel, to: dest, absFrom: abs, absTo: path.join(ORIGINALS, dest) });
  }

  if (unmatched.length) {
    console.error('Unmatched files (fix rules before continuing):');
    for (const u of unmatched) console.error('  ', u);
    process.exit(1);
  }

  let moved = 0;
  let skippedDup = 0;
  for (const m of moves) {
    await fs.mkdir(path.dirname(m.absTo), { recursive: true });
    try {
      await fs.access(m.absTo);
      // destination exists (e.g. LiDAR-Videos duplicate) — drop source
      await fs.unlink(m.absFrom);
      skippedDup += 1;
      console.log(`dup  ${m.from} → keep ${m.to}`);
    } catch {
      await fs.rename(m.absFrom, m.absTo);
      moved += 1;
      console.log(`move ${m.from} → ${m.to}`);
    }
  }

  // remove empty legacy dirs
  async function rmEmpty(dir) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.isDirectory()) await rmEmpty(path.join(dir, e.name));
    }
    entries = await fs.readdir(dir);
    if (entries.length === 0) {
      await fs.rmdir(dir);
      console.log(`rmdir ${toPosix(path.relative(ORIGINALS, dir))}`);
    }
  }
  await rmEmpty(ORIGINALS);

  console.log(`\nDone. moved=${moved} duplicatesRemoved=${skippedDup}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
