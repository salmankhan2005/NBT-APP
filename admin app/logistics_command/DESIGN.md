---
name: Logistics Command
colors:
  surface: '#fbf8fc'
  surface-dim: '#dbd9dc'
  surface-bright: '#fbf8fc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f6'
  surface-container: '#efedf0'
  surface-container-high: '#e9e7eb'
  surface-container-highest: '#e4e2e5'
  on-surface: '#1b1b1e'
  on-surface-variant: '#44474e'
  inverse-surface: '#303033'
  inverse-on-surface: '#f2f0f3'
  outline: '#75777f'
  outline-variant: '#c5c6cf'
  surface-tint: '#4e5e81'
  primary: '#031635'
  on-primary: '#ffffff'
  primary-container: '#1a2b4b'
  on-primary-container: '#8293b8'
  inverse-primary: '#b6c6ef'
  secondary: '#a04100'
  on-secondary: '#ffffff'
  secondary-container: '#fc7728'
  on-secondary-container: '#5d2300'
  tertiary: '#000f4a'
  on-tertiary: '#ffffff'
  tertiary-container: '#001f7c'
  on-tertiary-container: '#708aff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#b6c6ef'
  on-primary-fixed: '#081b3a'
  on-primary-fixed-variant: '#364768'
  secondary-fixed: '#ffdbcb'
  secondary-fixed-dim: '#ffb693'
  on-secondary-fixed: '#341000'
  on-secondary-fixed-variant: '#7a3000'
  tertiary-fixed: '#dde1ff'
  tertiary-fixed-dim: '#b8c3ff'
  on-tertiary-fixed: '#001356'
  on-tertiary-fixed-variant: '#0035be'
  background: '#fbf8fc'
  on-background: '#1b1b1e'
  surface-variant: '#e4e2e5'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  mono-data:
    fontFamily: Courier Prime
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  container-max: 1440px
  gutter: 20px
---

## Brand & Style

The brand personality is rooted in **unwavering reliability** and **operational intelligence**. This design system facilitates high-stakes decision-making by prioritizing data clarity over decorative elements. The visual language is a hybrid of **Corporate Modern** and **Utility-Driven Minimalism**, designed to reduce cognitive load for dispatchers and fleet managers who monitor complex, real-time logistics ecosystems.

The UI should evoke a sense of "Mission Control"—authoritative, calm, and hyper-efficient. We utilize a structured information hierarchy that treats data density as a feature, not a constraint. Surfaces are clean and organized, ensuring that when an alert triggers, it captures attention immediately without competing against the background.

## Colors

The palette is anchored by **Deep Navy (#1A2B4B)** to project institutional trust and authority. **Safety Orange (#F37021)** is used surgically for "Active" states, critical alerts, and primary actions that require immediate physical or digital intervention.

- **Primary (Navy):** Used for sidebars, primary headings, and structural boundaries.
- **Secondary (Orange):** Reserved for live trip statuses, warnings, and high-priority CTA buttons.
- **Accent (Blue):** Utilized for interactive elements, links, and secondary navigation.
- **Functional Colors:** Emerald Green handles "In-Transit" or "Delivered" success states, while Crimson Red is dedicated to "Overdue" or "Maintenance Critical" issues.
- **Neutral Palette:** A range of Slate Grays (from #0F172A to #F8FAFC) ensures that background surfaces provide sufficient contrast for complex data tables and map overlays.

## Typography

The design system utilizes **Inter** for its exceptional legibility in data-heavy environments and its neutral, professional tone. A disciplined type scale ensures that hierarchical relationships are clear even when screens are crowded with metrics.

For specific logistics identifiers—such as Consignment Numbers (CN), Vehicle Plates, and Chassis IDs—a monospaced font (**Courier Prime**) may be used at the label level to prevent character confusion (e.g., distinguishing "0" from "O"). 

**Usage Guidelines:**
- **Display & Headlines:** Use Navy (#1A2B4B) for high contrast.
- **Labels:** Always use uppercase with slight letter spacing for meta-data (e.g., "TRUCK ID").
- **Data Tables:** Body-md (14px) is the standard for row data to maximize vertical information density.

## Layout & Spacing

The layout follows a **Fluid Grid** model with a sidebar-centric navigation structure. This maximizes the horizontal real estate required for expansive data tables and map views.

- **Desktop:** 12-column grid. Sidebar is fixed at 260px. Main content area uses 24px margins and 20px gutters.
- **Tablet:** 8-column grid. Sidebar collapses to an icon-only rail (64px).
- **Mobile:** 4-column grid. Navigation moves to a bottom bar or hamburger menu. Margins reduce to 16px.

**Density Control:** To accommodate different user preferences, the system supports a "Compact" mode where vertical padding in tables and lists is reduced by 50% (from 16px to 8px).

## Elevation & Depth

This design system uses **Tonal Layering** supplemented by **Low-Contrast Outlines** to define hierarchy, avoiding heavy shadows to maintain a clean, "digital-first" aesthetic.

- **Level 0 (Background):** Slate-50 (#F8FAFC). The canvas for all content.
- **Level 1 (Cards/Sections):** White (#FFFFFF) with a 1px solid border in Slate-200. No shadow.
- **Level 2 (Overlays/Popovers):** White with a soft, 8px ambient shadow (10% opacity, Slate-900) to indicate temporary focus.
- **Level 3 (Modals):** White with a 16px diffused shadow and a 40% opacity Slate-900 backdrop blur.

Interactive maps should be treated as the lowest layer, with "floating" data cards positioned on top using Level 2 elevation.

## Shapes

The shape language is **Soft (0.25rem)**. This subtle rounding provides a modern feel while maintaining the structural rigidity expected in a professional logistics environment.

- **Standard Elements:** Buttons, input fields, and tags use 4px (0.25rem) radius.
- **Containers:** Dashboard cards and map panels use 8px (0.5rem) radius.
- **Status Badges:** Use a "Pill" shape (full rounding) to clearly distinguish status indicators from clickable buttons or input fields.

## Components

### Buttons
- **Primary:** Deep Navy background, White text. High-contrast.
- **Action:** Safety Orange background for "Dispatch," "Confirm," or "Start Trip."
- **Ghost:** Slate-200 border for secondary navigation (e.g., "Cancel," "Export").

### Data Cards & Sparklines
Dashboard cards display a single KPI (e.g., "Fuel Efficiency") with a **Deep Blue** sparkline trend at the bottom. The trend line should be simplified, removing axes to focus on the trajectory.

### Status Badges
Badges use light-tinted backgrounds with high-saturation text:
- **In Transit:** Light Green bg / Emerald text.
- **Idle:** Light Orange bg / Safety Orange text.
- **Delayed:** Light Red bg / Crimson text.

### Logistics Tables
Tables must support "sticky" headers and a first-column "sticky" ID (e.g., Trip ID). Rows use a subtle hover state (#F1F5F9). Action buttons within rows should be icon-only or discreet dropdowns to save space.

### Goods Consignment (GC) Views
The GC view should switch to a **"Report Mode"** styling—mimicking a physical PDF. It uses a serif-like structured layout (Source Serif 4 for body) to honor traditional logistics paperwork formats while remaining digitally interactive.

### Map Integration
Google Maps layers should be styled with a "Silver" or "Retro" simplified theme to ensure that custom markers (Truck Icons, Hubs) in Navy and Orange remain the focal point.