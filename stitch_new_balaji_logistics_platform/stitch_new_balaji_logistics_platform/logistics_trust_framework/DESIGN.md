---
name: Logistics Trust Framework
colors:
  surface: '#f7f9fc'
  surface-dim: '#d8dadd'
  surface-bright: '#f7f9fc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f7'
  surface-container: '#eceef1'
  surface-container-high: '#e6e8eb'
  surface-container-highest: '#e0e3e6'
  on-surface: '#191c1e'
  on-surface-variant: '#44474d'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f4'
  outline: '#74777e'
  outline-variant: '#c4c6cd'
  surface-tint: '#4f5f78'
  primary: '#000206'
  on-primary: '#ffffff'
  primary-container: '#0b1d33'
  on-primary-container: '#7586a0'
  inverse-primary: '#b7c7e5'
  secondary: '#0350d7'
  on-secondary: '#ffffff'
  secondary-container: '#356bf1'
  on-secondary-container: '#fefcff'
  tertiary: '#050200'
  on-tertiary: '#ffffff'
  tertiary-container: '#2b1900'
  on-tertiary-container: '#b67800'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d4e3ff'
  primary-fixed-dim: '#b7c7e5'
  on-primary-fixed: '#0a1c32'
  on-primary-fixed-variant: '#374860'
  secondary-fixed: '#dbe1ff'
  secondary-fixed-dim: '#b4c5ff'
  on-secondary-fixed: '#00174c'
  on-secondary-fixed-variant: '#003da9'
  tertiary-fixed: '#ffddb4'
  tertiary-fixed-dim: '#ffb955'
  on-tertiary-fixed: '#291800'
  on-tertiary-fixed-variant: '#633f00'
  background: '#f7f9fc'
  on-background: '#191c1e'
  surface-variant: '#e0e3e6'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1280px
  gutter: 24px
  margin-desktop: 40px
  margin-mobile: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style
The design system is engineered for a high-trust, B2B logistics environment. It balances industrial reliability with modern SaaS efficiency, targeting fleet owners, logistics managers, and corporate partners. 

The aesthetic is **Corporate Modern** with a focus on data-forward clarity. It utilizes heavy whitespace, crisp structural alignment, and a sophisticated color hierarchy to evoke a sense of precision and dependability. The interface avoids decorative flourishes in favor of functional excellence, ensuring that complex shipment data remains the primary focus.

## Colors
The palette is anchored by **Deep Navy (#0B1D33)**, providing an authoritative foundation for navigation and headers. **Trust Blue (#1C5AE0)** is reserved strictly for primary actions and interactive states, ensuring high discoverability.

**Safety Amber (#F5A623)** acts as a functional accent for status indicators, warnings, and logistical highlights (e.g., "In Transit" or "Pending Quote"). The background uses a soft **Off-white (#F4F6F9)** to reduce eye strain during long periods of data entry, while **Light Gray (#E4E8EE)** defines structural boundaries and borders without creating visual noise.

## Typography
Inter is used exclusively to maintain a systematic, utilitarian appearance. Headlines are bold and tightly tracked to convey confidence. Body text utilizes a generous 1.5x line-height to ensure legibility in dense data tables and shipment manifests.

For mobile views, headline sizes are aggressively scaled down to preserve screen real estate for map views and booking forms. Labels use a slightly heavier weight (500-600) to distinguish metadata from user-generated content.

## Layout & Spacing
The layout follows a **Fixed Grid** philosophy for desktop dashboards to ensure data consistency, switching to a fluid model for mobile booking flows. A strict 8px base unit governs all dimensions.

- **Desktop:** 12-column grid with 24px gutters. Content is centered in a 1280px container.
- **Tablet:** 8-column grid with 20px gutters.
- **Mobile:** 4-column grid with 16px gutters and side margins.

Information density should be "Comfortable" rather than "Compact" to prevent errors during high-stress logistics coordination. Use `stack-lg` for separating major sections and `stack-sm` for grouping related input fields.

## Elevation & Depth
Depth is conveyed through **Tonal Layering** and **Ambient Shadows**. This design system avoids harsh borders in favor of soft, diffused shadows that lift interactive cards above the neutral background.

- **Level 0 (Surface):** Off-white (#F4F6F9) for the main application background.
- **Level 1 (Card/Container):** Pure white (#FFFFFF) with a subtle 1px border (#E4E8EE).
- **Level 2 (Interactive):** Same as Level 1 but with a soft shadow (0px 4px 12px rgba(11, 29, 51, 0.05)).
- **Level 3 (Overlays/Modals):** High-diffusion shadow (0px 12px 32px rgba(11, 29, 51, 0.12)) to focus the user on critical tasks like "Confirm Booking."

## Shapes
The shape language is "Rounded" to soften the industrial nature of the business. 
- **Buttons and Inputs:** 8px (0.5rem) radius for a professional, modern feel.
- **Cards and Modals:** 16px (1rem) radius to define clear containment.
- **Status Tags/Chips:** Fully pill-shaped for quick visual scanning.

The consistency of these radii creates a cohesive, high-quality "finished" look across the entire platform.

## Components
### Buttons
Primary buttons use Trust Blue with white text. Hover states should darken the blue slightly. Secondary buttons use a Light Gray outline. All buttons must have an 8px corner radius and a minimum height of 44px for touch accessibility.

### Input Fields
Fields use a white background with a 1px #E4E8EE border. Focus states transition the border to Trust Blue with a subtle 2px outer glow. Labels are placed above the field in `label-sm`.

### Cards
Logistics data (Lorry details, Route Info, Pricing) is encapsulated in white cards with 16px padding. Use a Level 2 elevation on hover for clickable cards.

### Chips & Status Indicators
Status indicators (e.g., "Verified," "Delayed") use a light-tinted background of their functional color with high-contrast text. For example, "Active Green" uses a 10% opacity green background with 100% opacity green text.

### Progress Trackers
For shipment tracking, use a vertical or horizontal stepper with Trust Blue for completed steps and Safety Amber for the current "In Transit" step.

### Data Tables
Tables should avoid vertical borders. Use 1px horizontal dividers and a subtly different background color (#F8FAFC) for header rows to maintain a clean, readable flow of information.