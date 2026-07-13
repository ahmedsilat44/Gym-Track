---
name: Velocity Performance
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#bacac5'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#859490'
  outline-variant: '#3c4a46'
  surface-tint: '#3cddc7'
  primary: '#57f1db'
  on-primary: '#003731'
  primary-container: '#2dd4bf'
  on-primary-container: '#00574d'
  inverse-primary: '#006b5f'
  secondary: '#ffb2b9'
  on-secondary: '#67001f'
  secondary-container: '#891933'
  on-secondary-container: '#ff97a3'
  tertiary: '#d5d7ff'
  on-tertiary: '#131e8c'
  tertiary-container: '#b3b9ff'
  on-tertiary-container: '#3641a9'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#62fae3'
  primary-fixed-dim: '#3cddc7'
  on-primary-fixed: '#00201c'
  on-primary-fixed-variant: '#005047'
  secondary-fixed: '#ffdadc'
  secondary-fixed-dim: '#ffb2b9'
  on-secondary-fixed: '#400010'
  on-secondary-fixed-variant: '#891933'
  tertiary-fixed: '#e0e0ff'
  tertiary-fixed-dim: '#bdc2ff'
  on-tertiary-fixed: '#000767'
  on-tertiary-fixed-variant: '#2f3aa3'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Hanken Grotesk
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
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin-mobile: 20px
  margin-desktop: 40px
---

## Brand & Style
The brand personality is high-octane, disciplined, and premium. It targets athletes and fitness enthusiasts who value precision and performance data. The UI must evoke a sense of focused energy and technical superiority.

The design system employs a **Modern Corporate** foundation blended with **Glassmorphism** and **Tactile** elements. We use deep charcoal surfaces to reduce eye strain during workouts, punctuated by high-vibrancy accents that signify momentum. Visual depth is created through layered containers and subtle glows, mirroring the sleek aesthetic of high-end gym equipment and biometric wearables.

## Colors
The palette is built on a "Midnight" foundation. 
- **Primary (Teal):** Used for positive growth, completion, and primary action states.
- **Secondary (Coral):** Used for high-intensity targets, warnings, or secondary data points like heart rate zones.
- **Tertiary (Indigo):** Used for recovery metrics, weight tracking, and informational secondary accents.
- **Neutrals:** A range of deep blues and slates (Charcoal) provide the canvas. Pure black is avoided to maintain softness and depth; instead, we use highly desaturated navy tones for surfaces to maintain a premium "glassy" feel.

## Typography
The typographic system emphasizes legibility during physical activity.
- **Headlines:** Use **Hanken Grotesk** for its sharp, contemporary feel and athletic proportions.
- **Body:** **Inter** provides a neutral, highly readable foundation for exercise descriptions and notes.
- **Data/Labels:** **JetBrains Mono** is utilized for numerical data, workout durations, and set counts to give the UI a technical, high-performance "instrumentation" aesthetic. All numerical metrics should be monospaced to prevent layout shift during active timers.

## Layout & Spacing
This system follows a **8pt Grid** to ensure mathematical harmony.
- **Mobile First:** A fluid grid with a minimum side margin of 20px. 
- **Card-Based Architecture:** All primary content lives in containers. Cards use 16px internal padding (`md`) to maintain airiness even in data-dense views.
- **Vertical Rhythm:** Large sections are separated by 32px (`xl`), while related items within a group use 8px (`sm`) or 12px spacing.
- **Reflow:** On tablet and desktop, cards transition from a single stack to a multi-column masonry or grid layout (12 columns) to maximize data visualization real estate.

## Elevation & Depth
Depth is achieved through **Tonal Layering** and **Subtle Glows**.
- **Level 0 (Background):** Deepest navy/black (#020617).
- **Level 1 (Cards):** Surface color (#1E293B) with a subtle 1px border (Opacity 10% white) to define edges.
- **Level 2 (Active/Floating):** Use an ambient shadow with a tint of the primary color (Teal) to signify interaction or active status.
- **Glass Effects:** Top navigation bars and bottom tab bars use a background blur (20px) with 70% opacity to maintain context of the content scrolling underneath.

## Shapes
The design system uses a **Rounded** aesthetic to balance the technicality of the typography with an approachable, ergonomic feel.
- **Standard Cards/Inputs:** 0.5rem (8px) radius.
- **Buttons/Progress Pills:** Fully pill-shaped (rounded-full) for high touch-target affordance.
- **Media/Images:** Use 1rem (16px) radius to create a distinct visual container for workout videos or exercise photography.

## Components
- **Buttons:** Primary buttons are pill-shaped, using a solid Teal background with dark navy text. Secondary buttons use a ghost style with a Teal border.
- **Progress Rings:** Use a thick stroke with rounded caps. The background track should be a dark semi-transparent version of the surface color.
- **Data Cards:** Feature a "header" area with `label-sm` monospaced text and a main "value" area using `display-lg`.
- **Workout List Items:** High-contrast rows with exercise icons (outlined style) on the left and set/rep counts using monospaced font on the right.
- **Input Fields:** Darker than the card surface with a focus state that adds a subtle teal outer glow (2px blur).
- **Bottom Navigation:** Icon-only or Icon+Label with an active state indicated by a small teal dot or glowing indicator below the icon.