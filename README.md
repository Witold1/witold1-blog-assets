# Media for blog / portfolio

![Media](https://img.shields.io/badge/Media-images%20%7C%20SVG%20%7C%20video-4A90D9?style=flat-square)
![Optimize](https://img.shields.io/badge/Optimize-sharp%20%2B%20ffmpeg-000000?style=flat-square)
![Node](https://img.shields.io/badge/Node-20+-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![GitHub Pages](https://img.shields.io/badge/Host-GitHub%20Pages-222222?style=flat-square&logo=github&logoColor=white)
![CI](https://img.shields.io/badge/CI-GitHub%20Actions-2088FF?style=flat-square&logo=githubactions&logoColor=white)
![License](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey?style=flat-square)
![Status](https://img.shields.io/badge/Status-draft-orange?style=flat-square)
![AI Assistance](https://img.shields.io/badge/AI--Assistance-high-informational?style=flat-square)

Source files live in **`originals/`**, organized to mirror `my-next-app/content/` slugs. Web-ready derivatives go to **`generated/`** via CI (or locally) and are published to GitHub Pages.

## Layout (matches content/)

```text
originals/
  gallery/<gallery-item-slug>/           # ↔ content/gallery/items/<slug>.yaml
    <primary media>
    figures/                             # optional — post/project chrome only
  blogposts/<post-slug>/                 # ↔ content/blogposts/<slug>.mdx
    ...
    figures/
  projects/<project-slug>/               # ↔ content/projects/<slug>.mdx
    figures/
generated/                               # npm run optimize / CI — do not edit
```

### Primary vs `figures/`

| Kind | What it is | Where |
|------|------------|--------|
| **Primary** | The visualization itself (gallery card, carousel slides, hero still/video) | Directly under the slug folder |
| **`figures/`** | Auxiliary / editorial chrome: diagrams, banners, pipeline sketches, example insets, saved third-party images used in MDX | `<slug>/figures/` |

Path is the highlight — no special filename prefix needed. Inside `figures/`, use **short role names** (`dag.svg`, `banner.jpeg`), not the long `{slug}--…` form.

```text
projects/project-surnames-navigator-meta/figures/dag.svg
projects/project-surnames-navigator-meta/figures/banner.jpeg
gallery/experiment-osm-building-taxonomy/experiment-osm-building-taxonomy.mp4   # primary
gallery/experiment-osm-building-taxonomy/figures/dag.svg                        # auxiliary
```

## File naming (primary)

| Pattern | Use |
|---------|-----|
| `{slug}.{ext}` | Single primary asset (image or video) |
| `{slug}--{variant}.{ext}` | Variants: palette (`--hot`), index (`--1`), ISO (`--GTM`), theme (`--dark`) |

Hand-made `*_preview*` files were removed; `npm run optimize` emits `.thumb.webp` instead.

Example CDN keys (after optimize), with  
`NEXT_PUBLIC_MEDIA_BASE_URL=https://<user>.github.io/witold1-blog-assets`:

```yaml
src: gallery/lidar-breckenridge-colorado/lidar-breckenridge-colorado.webp
```

```mdx
coverImage: blogposts/project-surnames/viz-surnames-central-america/viz-surnames-central-america--merged.webp

![Pipeline](projects/project-surnames-navigator-meta/figures/pipeline-overview.webp)
```

## Local optimize

Requires Node 20+. Optional: `ffmpeg` on PATH for video posters.

```bash
npm install
npm run optimize
```

| Input | Published under same relative path |
|-------|--------------------------------------|
| JPEG / PNG / WebP / TIFF | `.webp` (max ~1920px) + `.thumb.webp` (~480px) |
| GIF | original + `.thumb.webp` when possible |
| SVG | copied as-is |
| MP4 / WebM / … | copied + `.poster.webp` / `.thumb.webp` if ffmpeg is available |

Also writes `generated/manifest.json`.

## GitHub Pages

Workflow `.github/workflows/optimize-and-publish.yml` runs optimize and deploys `generated/`.

Enable **Settings → Pages → Source: GitHub Actions** after you push.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run optimize` | Build `generated/` from `originals/` |
| `npm run clean` | Clear `generated/` (keeps README / `.gitkeep`) |

## Notes

- Prefer stable relative keys in the site; only change the media base URL if you move hosts.
- Gallery folders without a YAML yet (`population-charts-africa`, `population-charts-caribbean-america`, some surname viz folders) use the same naming so you can add content later.
- São Paulo gallery folder uses ASCII `lidar-central-sao-paulo-brazil` (content YAML may use `ã` — align names when you switch `src` to CDN keys).
- If unsure: gallery/card media → primary; anything only referenced from MDX prose → `figures/`.

## License

Except where otherwise noted, all visual assets here are © 2026 **Witold's Data Consulting** and shared under a [**CC BY-NC 4.0**](https://creativecommons.org/licenses/by-nc/4.0/) license (full text in [`LICENSE`](LICENSE)). Feel free to share them for any non-commercial project — just link back to the blog.

**Note on Data Sources:** This license applies solely to my original design, optimization, and visual layer. The underlying raw datasets may be subject to separate proprietary, open-source, or specific source licenses (including OpenStreetMap), which govern the raw data itself.

**Writing a news article, report, or book?** I'm easy to work with and happily grant free commercial use to journalists and think tanks. Just reach out through the contact options for the green light.

Third-party material (when present) keeps its original terms and should be marked in the relevant folder or content entry.
