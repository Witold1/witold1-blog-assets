import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ASSETS = path.join(ROOT, 'assets');
const ORIGINALS = path.join(ASSETS, 'originals');
const GENERATED = path.join(ASSETS, 'generated');

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.tif', '.tiff']);
const SVG_EXT = new Set(['.svg']);
const VIDEO_EXT = new Set(['.mp4', '.webm', '.mov', '.m4v']);

/** Longest edge for full web stills (video excluded). */
const WEB_MAX = 1920;
/** Longest edge for thumbs / gallery cards. */
const THUMB_MAX = 480;
const WEBP_QUALITY = 82;
const THUMB_QUALITY = 75;

function toPosix(p) {
  return p.split(path.sep).join('/');
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '.DS_Store' || entry.name === 'Thumbs.db') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.isFile()) {
      yield full;
    }
  }
}

function hasFfmpeg() {
  const r = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' });
  return r.status === 0;
}

async function copyFile(src, dest) {
  await ensureDir(path.dirname(dest));
  await fs.copyFile(src, dest);
}

async function writeWebpStill(inputPath, outPath, maxEdge, quality) {
  await ensureDir(path.dirname(outPath));
  const image = sharp(inputPath, { animated: false, failOn: 'none' });
  const meta = await image.metadata();
  const pipeline = image.rotate().resize({
    width: maxEdge,
    height: maxEdge,
    fit: 'inside',
    withoutEnlargement: true,
  });
  await pipeline.webp({ quality, effort: 4 }).toFile(outPath);
  const outMeta = await sharp(outPath).metadata();
  return {
    width: outMeta.width ?? meta.width ?? null,
    height: outMeta.height ?? meta.height ?? null,
  };
}

function extractPoster(videoPath, posterPath) {
  const result = spawnSync(
    'ffmpeg',
    [
      '-y',
      '-i',
      videoPath,
      '-ss',
      '00:00:01',
      '-vframes',
      '1',
      '-q:v',
      '2',
      posterPath,
    ],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) {
    throw new Error(result.stderr?.slice(0, 500) || 'ffmpeg poster failed');
  }
}

/** Fix legacy wordcloud export quirks before publish. */
function sanitizeSvg(text) {
  let out = text
    // Some exports claim ASCII but contain UTF-8 surnames (e.g. Mägi).
    .replace(
      /<\?xml[^>]*encoding=['"]ASCII['"][^?]*\?>\s*/i,
      '<?xml version="1.0" encoding="UTF-8"?>\n',
    )
    .replace(/style="fill:\((\d+),\s*(\d+),\s*(\d+)\)"/g, 'fill="rgb($1, $2, $3)"');
  if (!/\bviewBox=/i.test(out)) {
    const match =
      out.match(/<svg[^>]*\bwidth="([\d.]+)"[^>]*\bheight="([\d.]+)"/i) ||
      out.match(/<svg[^>]*\bheight="([\d.]+)"[^>]*\bwidth="([\d.]+)"/i);
    if (match) {
      const [, w, h] = match;
      out = out.replace(/<svg/i, `<svg viewBox="0 0 ${w} ${h}"`);
    }
  }
  return out;
}

async function processImage(absPath, relPosix, manifest) {
  const parsed = path.parse(relPosix);
  const baseKey = toPosix(path.join(parsed.dir, parsed.name));
  const webRel = `${baseKey}.webp`;
  const thumbRel = `${baseKey}.thumb.webp`;
  const webAbs = path.join(GENERATED, webRel);
  const thumbAbs = path.join(GENERATED, thumbRel);

  const web = await writeWebpStill(absPath, webAbs, WEB_MAX, WEBP_QUALITY);
  const thumb = await writeWebpStill(absPath, thumbAbs, THUMB_MAX, THUMB_QUALITY);

  manifest.push({
    type: 'image',
    source: relPosix,
    web: webRel,
    thumb: thumbRel,
    width: web.width,
    height: web.height,
    thumbWidth: thumb.width,
    thumbHeight: thumb.height,
  });
}

async function processSvg(absPath, relPosix, manifest) {
  const sanitized = sanitizeSvg(await fs.readFile(absPath, 'utf8'));
  const outRel = relPosix;
  const outAbs = path.join(GENERATED, outRel);
  await ensureDir(path.dirname(outAbs));
  await fs.writeFile(outAbs, sanitized, 'utf8');

  manifest.push({
    type: 'svg',
    source: relPosix,
    web: outRel,
  });
}

async function processVideo(absPath, relPosix, manifest, ffmpegOk) {
  const parsed = path.parse(relPosix);
  const baseKey = toPosix(path.join(parsed.dir, parsed.name));
  const videoRel = relPosix;
  await copyFile(absPath, path.join(GENERATED, videoRel));

  let posterRel = null;
  let thumbRel = null;
  let width = null;
  let height = null;

  if (ffmpegOk) {
    const tmpPoster = path.join(GENERATED, `${baseKey}.poster.jpg`);
    await ensureDir(path.dirname(tmpPoster));
    try {
      extractPoster(absPath, tmpPoster);
      posterRel = `${baseKey}.poster.webp`;
      thumbRel = `${baseKey}.thumb.webp`;
      const poster = await writeWebpStill(tmpPoster, path.join(GENERATED, posterRel), WEB_MAX, WEBP_QUALITY);
      const thumb = await writeWebpStill(tmpPoster, path.join(GENERATED, thumbRel), THUMB_MAX, THUMB_QUALITY);
      width = poster.width;
      height = poster.height;
      await fs.unlink(tmpPoster).catch(() => {});
      void thumb;
    } catch (err) {
      console.warn(`  poster skipped for ${relPosix}: ${err.message}`);
      await fs.unlink(tmpPoster).catch(() => {});
    }
  }

  manifest.push({
    type: 'video',
    source: relPosix,
    web: videoRel,
    poster: posterRel,
    thumb: thumbRel,
    width,
    height,
  });
}

async function clearGeneratedContent() {
  await ensureDir(GENERATED);
  const entries = await fs.readdir(GENERATED, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '.gitkeep' || entry.name === 'README.md') continue;
    await fs.rm(path.join(GENERATED, entry.name), { recursive: true, force: true });
  }
}

async function main() {
  await fs.access(ORIGINALS).catch(() => {
    throw new Error(`Missing assets/originals/ at ${ORIGINALS}`);
  });

  console.log('Cleaning assets/generated/ …');
  await clearGeneratedContent();

  const ffmpegOk = hasFfmpeg();
  if (!ffmpegOk) {
    console.warn('ffmpeg not found — videos will be copied without posters.');
  }

  const manifest = [];
  let images = 0;
  let svgs = 0;
  let videos = 0;
  let skipped = 0;

  for await (const absPath of walk(ORIGINALS)) {
    const rel = path.relative(ORIGINALS, absPath);
    const relPosix = toPosix(rel);
    const ext = path.extname(absPath).toLowerCase();

    try {
      if (IMAGE_EXT.has(ext)) {
        // Keep animated GIF as-is; still emit a static thumb when possible.
        if (ext === '.gif') {
          await copyFile(absPath, path.join(GENERATED, relPosix));
          const parsed = path.parse(relPosix);
          const baseKey = toPosix(path.join(parsed.dir, parsed.name));
          const thumbRel = `${baseKey}.thumb.webp`;
          let thumb = { width: null, height: null };
          try {
            thumb = await writeWebpStill(absPath, path.join(GENERATED, thumbRel), THUMB_MAX, THUMB_QUALITY);
          } catch (err) {
            console.warn(`  gif thumb skipped for ${relPosix}: ${err.message}`);
          }
          manifest.push({
            type: 'gif',
            source: relPosix,
            web: relPosix,
            thumb: thumb.width ? thumbRel : null,
            thumbWidth: thumb.width,
            thumbHeight: thumb.height,
          });
          images += 1;
          console.log(`gif  ${relPosix}`);
          continue;
        }
        await processImage(absPath, relPosix, manifest);
        images += 1;
        console.log(`img  ${relPosix}`);
      } else if (SVG_EXT.has(ext)) {
        await processSvg(absPath, relPosix, manifest);
        svgs += 1;
        console.log(`svg  ${relPosix}`);
      } else if (VIDEO_EXT.has(ext)) {
        await processVideo(absPath, relPosix, manifest, ffmpegOk);
        videos += 1;
        console.log(`vid  ${relPosix}`);
      } else {
        skipped += 1;
        console.log(`skip ${relPosix}`);
      }
    } catch (err) {
      console.error(`FAIL ${relPosix}: ${err.message}`);
      process.exitCode = 1;
    }
  }

  const manifestPath = path.join(GENERATED, 'manifest.json');
  await fs.writeFile(
    manifestPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        counts: { images, svgs, videos, skipped, total: manifest.length },
        assets: manifest.sort((a, b) => a.source.localeCompare(b.source)),
      },
      null,
      2,
    ),
  );

  const licenseSrc = path.join(ROOT, 'LICENSE');
  try {
    await fs.copyFile(licenseSrc, path.join(GENERATED, 'LICENSE'));
  } catch {
    console.warn('LICENSE not copied into assets/generated/ (missing at repo root?)');
  }

  console.log(
    `\nDone. images=${images} svgs=${svgs} videos=${videos} skipped=${skipped} → ${toPosix(path.relative(ROOT, GENERATED))}/`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
