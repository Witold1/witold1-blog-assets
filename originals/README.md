# originals/

Masters only. Folder names follow `my-next-app/content/`:

| Here | Content counterpart |
|------|---------------------|
| `gallery/<slug>/` | `content/gallery/items/<slug>.yaml` |
| `blogposts/<slug>/` | `content/blogposts/<slug>.mdx` |
| `projects/<slug>/` | `content/projects/<slug>.mdx` |
| `<slug>/figures/` | Auxiliary chrome (diagrams, banners, MDX-only images) |

Primary filenames: `{slug}.{ext}` or `{slug}--{variant}.{ext}`.  
Under `figures/`: short role names (`dag.svg`, `banner.jpeg`).

Do not link the site at this folder. Run `npm run optimize` (or CI) and use paths under `generated/`.

## License

Except where otherwise noted, visual assets are © 2026 Witold's Data Consulting under [CC BY-NC 4.0](../LICENSE). Non-commercial sharing with attribution is welcome; for commercial / press use, ask via [LinkedIn](https://www.linkedin.com/in/vital-yevtushenko/). See the [root README](../README.md#license).
