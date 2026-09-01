# 홈로그 (home.importants-studio.com)

Korean blog on newlywed and parenting life: admin, subsidies, and living guides. Hugo + PaperMod, GitHub Pages (merge to `main` = publish). Sister sites: 혜택줍줍, 차곡차곡.

## Invariant rules

- **NEVER push directly to `main`.** Branch + PR only; merging is a human decision.
- **NEVER leave Claude traces in commits.**
- **NEVER give medical advice** (symptoms, treatment, feeding/nutrition guidance). Vaccination/checkup topics: schedules and application procedures only; defer health judgment to pediatricians.
- Posts: `content/posts/YYYY-MM-DD-{english-slug}.md`. Frontmatter: title, date (T09:00:00+09:00 — future time is excluded from build), draft: false, slug, description, tags, categories (신혼/출산/육아지원/살림/생활 중 1개), sourceUrl.
- Style rules: `docs/writing-guide.md` — read before writing.
- Facts: amounts/deadlines/procedures need 2+ sources, official first (bokjiro.go.kr, gov.kr, 고용노동부, 주택도시기금, 정부24).
- Never modify `themes/PaperMod`. Verify `hugo --gc --minify` before committing.

## Theme constraints (PaperMod) — verified traps, do not rediscover

- **Dark mode is `:root[data-theme=dark]`, never a `.dark` class.** This PaperMod version toggles `html[data-theme]`. Any `.dark { ... }` rule is dead code — including the legacy `.dark` block near the top of `assets/css/extended/custom.css`. Don't add to it.
- **The content wrapper is `.post-content`, but the theme styles `.md-content`.** So the theme's own element styling (tables, etc.) never applies to posts. Anything rendered from markdown must be styled explicitly under `.post-content`.
- **The reset sets `table { display: block }`.** Table styles must restore `display: table` or columns collapse into each other.
- Markdown HTML is stripped (`unsafe: false`). Interactive markup (forms, widgets) belongs in `layouts/`, not in `.md` files.
- goldmark `strikethrough` is disabled on purpose — it eats Korean tilde ranges (`3~4일` → `34일`). Don't re-enable it.
- **Verify CSS against the served stylesheet, not the source file.** Fetch the fingerprinted `/assets/css/stylesheet.*.css` from the local Hugo server and grep for the new rule. A silently failed edit looks identical to success when you only read the source.
