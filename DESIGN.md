# Peat Bog UI design

This document describes the implementation, not proposals.

## Palette roles

- Bog greens (`--moss`, `--moss-bright`) signal growth and production.
- Coolant cyan (`--coolant`, `--coolant-dim`) signals compute and thermal state.
- Danger (`--danger`) signals heat and destructive actions.
- Panel and deep backgrounds keep dense game data readable.

## Type

- System sans-serif carries prose, labels, and controls.
- Monospace carries numbers, costs, rates, and save status.

## Shape and spacing

- `--radius-card` is the shared 10px shape for panels, resources, rows, and drawers.
- `--radius-control` is the shared 6px shape for buttons, tiles, and compact controls.
- `--space-row` keeps list rows dense and aligned.
- Targets use a 44px minimum height where keyboard or touch interaction matters.

## Density

The game favors dense list rows so production choices remain visible together.
Headings separate building categories and available versus upcoming upgrades.
Changing labels reserve their space to keep the list geometry stable.

## Motion

Harvest feedback, floating numbers, and toast entry are the only transient motion.
The harvest button has a slow CSS simmer to keep the core action alive.
`prefers-reduced-motion` disables animations and transitions while preserving content.
