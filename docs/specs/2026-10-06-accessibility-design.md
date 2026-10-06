# Accessibility — Design

**Date:** 2026-10-06
**Status:** Implemented

## Goal

The app and the reports it produces meet **WCAG 2.2 level AA**:

| Deliverable | Standard | Checked with |
|---|---|---|
| Web app, every page and session phase, EN and FR, 1280px and 320px wide | WCAG 2.2 AA | axe-core (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`, `best-practice`): 0 violations |
| PDF report | PDF/UA-1 (ISO 14289-1), the accessible-PDF standard WCAG relies on for PDF | veraPDF `--flavour ua1`: pass |
| Markdown and JSON exports | Plain text | — |

Automated checks do not prove compliance on their own: a pass with a screen reader (NVDA + Firefox, VoiceOver + Safari) through a full session is part of the manual test checklist in the README.

## Web app

### Structure and navigation

- **Landmarks:** one `header`, one `main#main`. A **skip link** (`.skip-link`, first tab stop) moves focus to `main`; it does not follow the anchor, since the hash belongs to the router.
- **Headings:** the brand in the header is the only `h1`. Each page or view titles itself with an `h2`; sections are `h3`, sub-sections `h4`. ODS `Text` presets set the look, `as` sets the level: `<Text preset={TEXT_PRESET.heading4} as="h2">`. No heading inside a button (the accordion trigger uses `as="span"`) or a table cell.
- **Page titles:** `usePageTitle(page)` names the tab `<page> – Squad Health Check` and follows the language switch. The presenter window keeps its `Presenter — <CODE>` prefix so it stands out in the screen-share picker.
- **Lists:** participants, voters of the round and categories are `ul`/`ol` elements; the category list is labelled.
- **Tables:** the vote matrix has a visually hidden caption and `th` headers for rows and columns.
- **Language:** `<html lang>` follows the UI language; a category name shown in the other language carries its own `lang`.

### Focus

- A route change focuses `main`, so keyboard and screen reader users start at the top of the new page. The first load does not, so the skip link stays first.
- When the control in use disappears with its view, focus goes to what replaced it:
  - `useFocusIfLost(ref)` focuses an element on mount only if focus fell back to `body`; used by the vote confirmation and the facilitator's main action.
  - The facilitator's controls render **one** button whose label and action follow the phase, so the same element keeps the focus from start to reveal to next.
  - The category editor moves focus explicitly (`data-focus` targets) after save, cancel, remove, add, reset and move.
- A failed submit focuses the first invalid field (join forms, category form, vote form).
- `html { scroll-padding-top }` keeps the focused element clear of the sticky header (2.4.11).
- Elements focused by script only (`tabindex="-1"`) get no focus ring.

### Keyboard and pointer

- Categories reorder by drag and drop **or** with move up/down buttons (2.1.1, 2.5.7).
- Every target is at least 24×24px (2.5.8); the language switch was the one exception.
- Trend choices show their label under the arrow on every screen size: a tooltip never shows on touch, and wrapping a radio in a tooltip trigger nests interactive elements.

### Forms

- Every field has a visible label through ODS `FormField`; mandatory ones say so and carry `required`.
- Every invalid state has error text, linked to its field. ODS `Quantity` misses the `FormField` error, so the minutes field passes `aria-describedby` itself.
- Input purpose: the join name field uses `autocomplete="nickname"`.

### Status messages (4.1.3)

Shown without moving focus, announced through `role="status"`/`aria-live="polite"` regions that stay mounted, or `role="alert"` for errors:

| Message | Where |
|---|---|
| Link copied | `SessionCodeButton` |
| Votes received (facilitator) | `FacilitatorControls`, `VoteProgress` |
| Votes added for people without the app | `ResultsGrid` |
| Category added, removed, moved | `CategoryEditor` |
| New round, results revealed, session finished (participants) | `SessionPage` |
| Connecting, reconnecting | `SessionStatus`, `SessionPage` |
| Creation, join and import errors | `role="alert"` on the ODS `Message` |

ODS `Message` has no live role of its own.

### Colour and contrast

- Text meets 4.5:1 and UI parts 3:1 against ODS tokens (`--ods-color-neutral-600` captions: 5.7:1 on white).
- Vote matrix cells tint with `--ods-color-{status}-100` (count text ≥ 4.9:1). The former `-300` tints fell to 2.4:1.
- Colour never carries meaning alone: vote colours are named in badges, the round timer swaps its icon when past the slot, voters who voted get a check icon.
- `prefers-reduced-motion` turns off transitions and animations.

### Non-text content

- ODS `Icon` renders `role="presentation"`; icon-only buttons get an `aria-label` (and a `title` for mouse users).
- The facilitator's crown is announced as "facilitator"; the QR code is an image named "Scan to join the session"; spinners are hidden, the text beside them says what loads.

### Accepted exceptions

- **Round timer (2.2.2):** it updates every second and cannot be paused; it is essential to the activity. It is not read aloud on each tick (`role="timer"`).
- **Descriptions of custom categories** fall back to English in the French UI without a `lang` of their own: the language of text typed by the facilitator is not known.

## PDF report

`buildPDF` uses **PDFKit** (jsPDF cannot write a structure tree) and produces a tagged PDF/UA-1 document:

- **Structure tree in reading order:** `Document` › `H1` title, `P` date, `P` voters, `H2` "Notes", then one `Sect` per category: `H3` "n. Title", `P` vote count, `P` "Median: Orange · Stable", `P` note. A note running over a page break stays **one** `P` with one marked part per page.
- **Artifacts:** card borders, the rule under the heading, badge fills, trend arrows (the badge text already names the trend) and the page footer (`Pagination`) are marked as artifacts, so readers skip them.
- **Document:** `/Lang` (`en`/`fr`), `Title` with `DisplayDocTitle`, `MarkInfo /Marked true`, PDF/UA identifier in the XMP metadata.
- **Fonts:** Source Sans 3 (the ODS font), embedded from the `source-sans` package. The **OTF (CFF)** files are used: with the TTF ones, accented letters are composite glyphs whose parts PDFKit leaves out of the font's `CIDSet`, which fails PDF/UA.
- PDFKit, its fonts (~670 kB) and the PDF code load only when the facilitator downloads the PDF.

`pdfReport.test.ts` reads the PDF back with pdf.js and asserts the tags with their text, the artifacts, the language, the title and the marking.

## How to check

```bash
# App: axe-core in a headless browser (see README › Accessibility)
# PDF: generate a report, then
docker run --rm -v "$PWD":/data verapdf/cli --flavour ua1 --format text /data/report.pdf
```
