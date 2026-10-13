# zze / High School — Afterglow

An editorial 2D photo flipbook for GitHub Pages. The site is static: no build step or package installation is required.

It includes 130 photographs with the Fuji dusk treatment, a white autumn cover with a small `zze` watermark, aged paper grain and crease textures, varied editorial layouts, page-turn audio, and a looping `So Sick` soundtrack loaded from `assets/audio/so-sick.flac`.

The five selected photographs open the photo sequence in the requested order. The remaining 14 photographs from the second batch are randomly interleaved with the previous 111 photographs. The published sequence is fixed, so reloading keeps the same order.

## Publish to GitHub Pages

Upload the contents of this folder to the repository root so `index.html` sits at the top level. In **Settings → Pages**, choose **Deploy from a branch**, select `main` and `/ (root)`, then save.

All site URLs are relative, so the package works from a repository subpath such as `https://YOUR_USERNAME.github.io/YOUR_REPOSITORY/`.

## Local preview

```sh
python -m http.server 4173 --bind 127.0.0.1
```

Open `http://127.0.0.1:4173/`. Browsers may require the first click before background audio can start; use the **Sound** control in the header.

## Structure

```text
index.html                 flipbook entry point
styles.css                 reading room, cover, paper and editorial layouts
flipbook.js                page-turn interaction, audio and keyboard controls
assets/photos/             130 interior photographs and cover image
assets/audio/so-sick.flac  looping soundtrack
style/                     fonts and paper/cloth textures
vendor/                    page-flip library and license
.nojekyll                  static GitHub Pages marker
```

The bundled font and page-flip licenses are kept in `style/fonts/LICENSE.md` and `vendor/PAGE-FLIP-LICENSE`.
