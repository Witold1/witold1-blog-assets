# assets/

Media for the blog / portfolio:

| Folder | Role |
|--------|------|
| [`originals/`](originals/) | Source masters (edit here) |
| [`generated/`](generated/) | Web derivatives from `npm run optimize` (do not edit) |

CDN / GitHub Pages serves the **contents** of `generated/` at the site root, so MDX keys stay `gallery/…`, `projects/…`, etc.
