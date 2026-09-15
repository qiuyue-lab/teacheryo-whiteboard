# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Skill Does

`visual-cognition-slides` is an AI skill that turns knowledge into learnable HTML slide decks grounded in cognitive science. It is a **prompt-native skill**, not a code project — the primary deliverable is generated HTML, not maintained source code.

The skill runs a 5-step conversational workflow (defined in `SKILL.md`): intake → narrative structure → style/format selection → visual translation → HTML generation.

## Running the Conversion Scripts

```bash
# PPTX → HTML (preserves text + images)
pip install python-pptx Pillow
python3 scripts/pptx_to_slides.py input.pptx [output.html] [--theme N]

# PDF → HTML (image mode, preserves layout)
pip install pymupdf Pillow
python3 scripts/pdf_to_slides.py input.pdf [output.html]

# PDF → HTML (text extraction mode, editable)
python3 scripts/pdf_to_slides.py input.pdf --text
```

No build step, no package manager, no test suite. Output HTML files are fully self-contained.

## File Architecture (Progressive Disclosure)

`SKILL.md` is the master controller (~150 lines). All other files are loaded on-demand — do not pre-load them:

| File | Loaded at | Contents |
|------|-----------|----------|
| `SKILL.md` | Always | 5-step workflow, file map, hard constraints |
| `PEDAGOGY.md` | Step 2 + 4 | 8 narrative structures, 6 knowledge types, 6 explanation modes, 10 cognitive science principles, animation-to-cognitive-goal mapping table |
| `STYLES.md` | Step 3 + 5 | CSS variables, fonts, shadow/texture rules for 8 themes |
| `ANIMATIONS.md` | Step 4 + 5 | 10 chapters of reusable CSS/SVG/JS animation code |
| `FORMATS.md` | Step 4 + 5 | 5 canvas sizes, `scaleCanvas()` JS, clamp-based typography system, `SlideController` class, inline edit + export, 4 slide sequence templates |

## Key Technical Patterns in Generated HTML

**Canvas scaling** — all slides use `data-w`/`data-h` attributes + a `scaleCanvas()` function that applies `transform:scale()` + centered margins. Never use viewport units for layout inside a slide.

**Typography** — use `clamp()` variables (`--size-hero` through `--size-caption`) from `FORMATS.md`, not fixed `px` values.

**Navigation** — the `SlideController` class in `FORMATS.md` handles keyboard (Arrow/Space/F), click, and touch. Override `onEnter` and `onReveal` hooks for per-slide animation triggers.

**Animation control** — all animations are user-triggered (click or `data-step` reveal), never auto-playing. No `setInterval` infinite loops. Complex animations get a replay button.

**Performance** — animate only `transform` and `opacity` (no layout-triggering properties). Particle count: ≤30 mobile, ≤100 desktop. Include `prefers-reduced-motion` fallback.

**Inline editing** — pressing `E` reveals an edit toolbar with `contenteditable` toggle and one-click HTML export (see `FORMATS.md` §4).

## Hard Constraints

These are non-negotiable regardless of user request:

- No bullet-point lists — replace with layouts or step-reveal animations
- No dark gradient + white text ("tech conference" aesthetic)
- One cognitive unit per slide
- No narration text copied directly onto slides
- Animations are always user-controlled, never auto-playing
