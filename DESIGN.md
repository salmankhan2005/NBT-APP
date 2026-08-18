# Design System Tokens — New Balaji Transports

This document serves as the single source of truth for the design tokens of the public NBT logistics website, extracted directly from the Stitch project. These tokens are mapped to CSS variables for use in Tailwind CSS.

---

## 1. Colors

All colors are mapped to CSS variables defined in `globals.css` and referenced in `tailwind.config.ts`.

### Core Palette
- **Deep Navy (Primary / Structural):** `#0b1d33` 
  - *Tailwind variable:* `var(--color-primary)` (default text color, primary headers, dark backgrounds)
- **Trust Blue (Secondary / Interactive):** `#1c5ae0`
  - *Tailwind variable:* `var(--color-secondary)` (primary buttons, links, active states)
- **Safety Amber (Tertiary / Logistical Accent):** `#f5a623`
  - *Tailwind variable:* `var(--color-tertiary)` (warnings, "In Transit" status highlights, logistical accents)
- **Background Neutral:** `#f4f6f9`
  - *Tailwind variable:* `var(--color-background)` (off-white for main page backgrounds)
- **Border / Divider Neutral:** `#e4e8ee`
  - *Tailwind variable:* `var(--color-border)` (structural boundaries and borders)
- **White (Card Surface):** `#ffffff`
  - *Tailwind variable:* `var(--color-surface)` (interactive cards, modules)

### Semantic Palette
- **Error / Alert Red:** `#ba1a1a` 
  - *Tailwind variable:* `var(--color-error)` (errors, validation failures)
- **Success / Active Green:** `#15803d`
  - *Tailwind variable:* `var(--color-success)` (success states, verified tags)

---

## 2. Typography

The design system uses **Inter** as the primary font family for all text elements.

| Token | Font Family | Size | Weight | Line Height | Letter Spacing |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `headline-xl` | Inter | `48px` | Bold (`700`) | `56px` | `-0.02em` |
| `headline-lg` | Inter | `32px` | Bold (`700`) | `40px` | `-0.01em` |
| `headline-lg-mobile` | Inter | `24px` | Bold (`700`) | `32px` | `normal` |
| `headline-md` | Inter | `24px` | Semibold (`600`) | `32px` | `normal` |
| `body-lg` | Inter | `18px` | Regular (`400`) | `28px` | `normal` |
| `body-md` | Inter | `16px` | Regular (`400`) | `24px` | `normal` |
| `body-sm` | Inter | `14px` | Regular (`400`) | `20px` | `normal` |
| `label-md` | Inter | `14px` | Semibold (`600`) | `16px` | `0.05em` |
| `label-sm` | Inter | `12px` | Medium (`500`) | `16px` | `normal` |

---

## 3. Spacing Scale

A strict 8px base unit drives the layout spacing.

- **Base:** `8px` (`var(--spacing-base)`)
- **Container Max:** `1280px`
- **Gutter:** `24px` (`var(--spacing-gutter)`)
- **Margin Desktop:** `40px` (`var(--spacing-margin-desktop)`)
- **Margin Mobile:** `16px` (`var(--spacing-margin-mobile)`)
- **Stack Sm:** `8px` (`var(--spacing-stack-sm)`)
- **Stack Md:** `16px` (`var(--spacing-stack-md)`)
- **Stack Lg:** `32px` (`var(--spacing-stack-lg)`)

---

## 4. Border Radii (Shapes)

- **Standard Buttons / Inputs:** `8px` (`rounded-md` / `0.5rem`)
- **Cards / Containers:** `16px` (`rounded-xl` / `1rem`)
- **Status Tags / Badges:** Full (`rounded-full` / `9999px`)

---

## 5. Elevation & Depth (Shadows)

- **Level 0 (Surface):** No shadow. Neutral background `#f4f6f9`.
- **Level 1 (Card/Container):** Standard borders (`1px solid #e4e8ee`) without shadow on white background `#ffffff`.
- **Level 2 (Interactive Cards - Hover):** Soft, diffused shadow for active/hover states:
  - `box-shadow: 0px 4px 12px rgba(11, 29, 51, 0.05)`
- **Level 3 (Overlays/Modals):** High-diffusion shadow for focus:
  - `box-shadow: 0px 12px 32px rgba(11, 29, 51, 0.12)`

---

## 6. Component States

### Buttons
- **Primary (Trust Blue):** Hover state darkens color slightly (`#144bb2`). Active state applies scale micro-animation. Focus outline in Trust Blue.
- **Secondary:** Light gray outline. Hover state applies light neutral fill (`#f8fafc`).
- **Disabled:** Background set to `#e4e8ee`, text to `#94a3b8`, pointer events disabled.

### Input Fields
- **Default:** White background, `1px solid #e4e8ee` border, `8px` border radius.
- **Hover:** Border transitions to `#cbd5e1`.
- **Focus:** Border transitions to Trust Blue (`#1c5ae0`) with a subtle 2px outer glow (`box-shadow: 0 0 0 2px rgba(28, 90, 224, 0.15)`).
- **Error:** Border changes to Red (`#ba1a1a`).
