# Aura Civic Establishment

**A place for shared possibility, around the clock.**

[Visit the site](https://auraofintelligence.github.io/aura-civic-establishment/) · [Explore overlaps](https://auraofintelligence.github.io/aura-civic-establishment/overlaps.html) · [Try the calculators](https://auraofintelligence.github.io/aura-civic-establishment/capacity.html) · [Read the sources](https://auraofintelligence.github.io/aura-civic-establishment/sources.html)

![An imagined shared civic hub](assets/images/generated-civic-hub-concept-1536.webp)

*AI-generated concept, 7 November 2026. An imagined civic interior, not a photograph or design of the existing candidate premises. [Prompts and provenance](data/generated-image-provenance.json).*

This public site explores a possible **24/7 shared civic establishment with KYC**, with **433 Logan Road, Stones Corner, Brisbane** as a candidate location. **Everything is still a system in development.** The activity mix, use of space, participating people and ways of working remain open. Dunwich is also a developing concept, with no confirmed programme. Linked websites and repositories document ideas, rather than confirmed operations or partnerships.

Author: **Luke Nathan Hayes / Strange But True / Aura of Intelligence**.

[First-edition status and continuation notes](PROJECT_STATUS.md) record what is available and which local inputs will strengthen the next edition.

## Explore

- **The place:** dated indoor-area evidence, plan references and the questions a current room inventory can answer.
- **Useful overlaps:** select programmes and discover the rooms, equipment and support they could share.
- **Shared use:** explore questions about people, hours and possible use of space, without prescribing a timetable or operating system.
- **Calculators:** space, desk-hours, room-hours, visits, operating costs, the existing lease reference and an optional compute module.
- **Workforce and community:** teaching, women’s enterprise, practical work, resilience and voluntary contribution.
- **A working discussion:** optional prompts, a printable guide and a downloadable template.
- **The wider network:** project websites, repositories, government responsibilities and a searchable source catalogue.

The public website is a planning tool. It does not collect identity documents or issue building credentials. Editable scenarios keep historical evidence, proposed services and assumptions in their own terms. C-Hour records voluntary human time with no monetary equivalent; money and outcomes have separate records.

## Run locally

The site is plain HTML, CSS and JavaScript modules. It needs no application dependencies, API keys, analytics service or database.

```text
node scripts/defaults.mjs
python scripts/build.py
python scripts/serve.py --port 8768
```

Open `http://127.0.0.1:8768/`. HTTP is needed for browser modules and JSON loading. Page text, navigation, sources and default calculator results remain readable without JavaScript.

Use your configured Node and Python runtimes. The desktop build uses Codex’s bundled runtimes. GitHub Actions supplies Node and Python on its runner.

## Check

```text
node --test tests/model.test.mjs
node --check assets/site.mjs
python scripts/check.py
```

`scripts/check_browser.cjs` runs the browser checks using an available Playwright installation. Set `PLAYWRIGHT_MODULE` if the package is outside normal Node resolution. Screenshots and reports are written to ignored `checks/`.

## Maintain

| Location | Purpose |
| --- | --- |
| `scripts/page_content.py` | Authored page content and calculator fields |
| `scripts/build.py` | Shared template, navigation, metadata and discovery files |
| `assets/site.css` | Responsive visual system, print and reduced-motion styles |
| `assets/model.mjs` | Pure arithmetic functions |
| `assets/site.mjs` | Accessible browser interactions and scenario handling |
| `data/default-results.json` | Reproducible starting assumptions and outputs |
| `data/programmes.json` | Programme and shared-resource relationships |
| `data/references.json` | Public source catalogue |
| `data/partners.json` | Dated representatives and portfolio mapping |
| `data/images.json` | Image subjects, creators, licences and sources |
| `AGENTS.md` | Instructions for future contributors and AI collaborators |

Update the source, regenerate the pages and run the relevant checks. Preserve the dates and measurement basis of building evidence. Do not turn an area allowance into a statutory occupancy or an illustrative income line into a funding commitment.

## Publish

The `pages.yml` workflow tests, builds and packages an explicit static publication, then deploys it to GitHub Pages. The publishing branch is `main`. The site includes `.nojekyll`, complete navigation, a sitemap, project-path `robots.txt`, `llms.txt`, canonical URLs, social previews, favicon sizes and a web manifest.

Scenario inputs and the guide checklist stay in the visitor’s browser unless they choose to export or share them. They contain planning numbers and selected programme IDs, not identity records.

## Rights

Original material is covered by the **[Strange But True Public Source Licence](LICENCE.md)**. It is publicly readable source, not an open-source licence. Commercial, corporate, institutional and government use requires the author’s written permission under that licence.

Photographs and other third-party material retain their own licences. [Image credits](https://auraofintelligence.github.io/aura-civic-establishment/credits.html), [rights notes](RIGHTS.md) and [AI transparency](AI-TRANSPARENCY.md) preserve those distinctions.
