# Website design and maintenance

These notes support work on the repository. Public pages focus on the developing civic-place idea, building evidence, possible overlaps and tools for exploring them.

## Identity

Use Australian English, AUD and metric units. Keep the Strange But True Public Source Licence intact, with separate rights for third-party photographs.

The palette is ink `#091429`, cobalt `#3864ed`, amber `#f6ba54`, cream `#f3f0e7` and mint `#8cdbc1`. Use generous image compositions, readable type and varied section layouts. Every public page has its own responsive hero, caption and provenance entry.

## Content status

Everything is still a system in development. There is no confirmed Dunwich programme. Distinguish building evidence, authored proposals and editable scenario assumptions. Do not invent operating arrangements, schedules or participant obligations. Read [AGENTS.md](../AGENTS.md) before editing.

## Images

Photographs identify their actual subject, creator and licence. Generated images are labelled as concepts and retain their provenance. They do not depict the existing candidate building. Inline figures retain their proportions; hero images adapt through a display crop. Keep captions outside the image.

The image register is [data/images.json](../data/images.json). New concept prompts are in [data/generated-image-provenance.json](../data/generated-image-provenance.json).

## Colour and accessibility

Dark components nested in cream sections need explicit foreground colours. The KYC question panel uses light body text, white headings and muted light notes on navy. Cream cards use dark ochre numbering; citations use dark blue links and slate supporting text.

Check text against its actual component background, including dropdown states and dynamic results. Keep keyboard focus visible. Support mobile layouts, reduced motion, printing and useful content without JavaScript.

With a local preview running and Playwright available, `node scripts/check_contrast.cjs` checks visible main-content text on solid backgrounds. It excludes photographic heroes, gradients and translucent layers, which need visual review. It uses the same `SITE_URL`, `PLAYWRIGHT_MODULE` and `BROWSER_EXECUTABLE` environment settings as the other browser checks.

## Publishing

[scripts/build.py](../scripts/build.py) generates the public HTML, navigation, previous/next links, sitemap and discovery files. Page content lives in [scripts/page_content.py](../scripts/page_content.py). Styling lives in [assets/site.css](../assets/site.css), interactions in [assets/site.mjs](../assets/site.mjs) and formulas in [assets/model.mjs](../assets/model.mjs).

Run appropriate static and browser checks before publishing through the existing GitHub Pages workflow. Keep technical maintenance documentation in the repository.
