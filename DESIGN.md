# Peat Bog visual system

This document describes the implemented visual system, not proposals.

- **Concept:** the bog is the world; the ledger is the record.
- **Surfaces:** `--bog-0` through `--bog-3` move from page to raised card.
- **Ink:** cream `--ink`, dim `--ink-dim`, and faint `--ink-faint` carry the record voice.
- **Roles:** broth is amber, coolant is cyan, moss is success, peat is brown, evidence is parchment, and cores are violet.
- **Type:** display serif headings, system sans controls and prose, monospace numbers and rates.
- **Shape:** cards use `--r-lg`, controls use the square `--r-sm`, and rules replace shadows.
- **Density:** list rows stay compact with 44px minimum targets and stable three-column geometry.
- **Composition:** the ledger strip anchors resources; the field holds harvest, thermal, fieldwork, and prestige; the panel holds tabs, filters, lists, and the buy dock.
- **Responsive behavior:** desktop uses a fixed two-column frame; mobile stacks the field and ledger and keeps the buy dock sticky.
- **Motion:** mist, vat bubbles, simmer, tab movement, feedback floats, and toasts are product cues; reduced motion removes them.
- **Accessibility:** semantic buttons, meters, tabs, live regions, reserved feedback geometry, and visible coolant focus rings remain part of the interface.
- **Drainage Charter:** the Charter tab groups keyed rows under Roots, Kindling, and Filing. Each row keeps its Bog Core cost in the cost column and offers a `Sign` action that becomes `Signed ✓`; locked rows name their parent and unaffordable rows are disabled. The intro states that spent cores stop paying their +5% production bonus while signed terms survive draining.
- **Field notes:** a rotating court-record field note follows the case line in the footer, changing every 20 seconds without shifting the shell.
- **Scenes:** every panel tab is a place: Docket uses the warm ruled hall (`hall`), Production the peat cut (`cut`), Upgrades the ember-lit shed (`shed`), Research the glass still (`still`), Achievements cold stones (`stones`), Charter the starfield (`sky`), and Settings the plain office (`office`). The panel exposes one `--scene-accent` token, reused for the active tab rule, production filter, section eyebrow, and row hover rule.
- **Ambient wisps:** nine deterministic CSS wisps drift through the shell; still bubbles rise only in the still scene. Both pause when the document is hidden.
- **Tactile states:** buy rows press by one pixel with an inset rule, affordable Buy pills breathe with an ember shadow, and successful counts pop. Harvest uses a short punch; Claim and Sign draw a 320ms check.
- **Emblems:** tabs use small current-color SVG emblems (scroll, spade, gear, alembic, stone, star, and sliders) so chrome remains legible without emoji.
- **Sound:** optional synthesized Web Audio cues are off by default, persisted at `peat-bog:sound`, and available from the header or Settings.
- **Reduced motion:** `prefers-reduced-motion: reduce` removes wisps and bubbles, freezes scene movement, and leaves all content, controls, and focus behavior intact.
- **Measured cost:** at 1280px over a two-second Playwright/CDP sample, Production averaged 71.421ms per rAF frame with 14 animated elements; Charter averaged 70.832ms with 18 animated elements.
