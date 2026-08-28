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
