---
name: Luxury Casino Bluffing
colors:
  surface: '#131317'
  surface-dim: '#131317'
  surface-bright: '#39393d'
  surface-container-lowest: '#0e0e12'
  surface-container-low: '#1b1b1f'
  surface-container: '#1f1f23'
  surface-container-high: '#2a292e'
  surface-container-highest: '#353439'
  on-surface: '#e4e1e7'
  on-surface-variant: '#d2c5ae'
  inverse-surface: '#e4e1e7'
  inverse-on-surface: '#303034'
  outline: '#9a8f7b'
  outline-variant: '#4e4635'
  surface-tint: '#f1c03f'
  primary: '#ffe4a9'
  on-primary: '#3e2e00'
  primary-container: '#f5c443'
  on-primary-container: '#6b5100'
  inverse-primary: '#775a00'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#ffdfdc'
  on-tertiary: '#68000a'
  tertiary-container: '#ffb9b3'
  on-tertiary-container: '#ac0c1c'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdf98'
  primary-fixed-dim: '#f1c03f'
  on-primary-fixed: '#251a00'
  on-primary-fixed-variant: '#5a4300'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffdad7'
  tertiary-fixed-dim: '#ffb3ad'
  on-tertiary-fixed: '#410004'
  on-tertiary-fixed-variant: '#930013'
  background: '#131317'
  on-background: '#e4e1e7'
  surface-variant: '#353439'
typography:
  headline-xl:
    fontFamily: Cairo
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 40px
  headline-lg:
    fontFamily: Cairo
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Cairo
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
  headline-sm:
    fontFamily: Cairo
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: Tajawal
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body-md:
    fontFamily: Tajawal
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  body-sm:
    fontFamily: Tajawal
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Cairo
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 20px
  label-md:
    fontFamily: Cairo
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
  label-sm:
    fontFamily: Cairo
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 0.75rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style
The design system establishes a high-stakes, exclusive midnight casino ambiance tailored for Arabic-first bluffing and trivia gaming. It blends the tactile prestige of high-roller VIP lounges with precise, mobile-first arcade usability. The mood is mysterious, celebratory, competitive, and distinctly luxurious.

Key visual pillars:
- **Atmospheric Darkness**: Deep obsidian and charcoal bases (`#0D0D11`, `#16161E`) provide an expansive backdrop, eliminating visual clutter and making vibrant poker cues pop.
- **Metallic Gold Hierarchy**: Warm, burnished casino golds serve as the hero interactive and trophy metal, evoking physical chips, foil-stamped cards, and golden crowns.
- **Tactile High-Roller Skeuomorphism**: Subtle linear gradients, radial table glows, and bevel-mimicking borders recreate the physical tension of authentic felt poker tables, stacks of chips, and glossy playing cards without overwhelming clean digital affordances.
- **RTL-Native Ergonomics**: Interface flows, bet ladders, drawer transitions, and chat alignments naturally honor right-to-left layout mechanics designed for one-handed 390px mobile play.

## Colors
The palette captures the tension and glamour of midnight poker. Gold commands authority, flanked by instantly recognizable cardroom status colors.

### Core Palettes
- **Hero Gold (Primary)**:
  - Gold Bright (`#FDE68A`): Shimmer highlights, inner ring bevels, top gradients.
  - Gold Casino (`#F5C443`): Primary CTA surfaces, active state toggles, pot indicators.
  - Gold Burnished (`#D4AF37`): Key strokes, card framing, elevated badge outlines.
  - Gold Shadow (`#855B14`): Lower bevel gradients, pressed button states.
- **Game Action Palette**:
  - Green / Call & Raise (`#10B981`): Dynamic progression, matching bets, player ready signals.
  - Red / Fold & Resign (`#EF4444`): High-friction danger zones, folding, countdown expiration.
  - Blue / Check & Match (`#3B82F6`): Neutral tactical gameplay, informational matching bids.
- **Dark Neutral Foundations**:
  - Felt Obsidian (`#0D0D11`): Canvas background, app scaffolding.
  - Card Midnight (`#16161E`): Modal overlays, card plates, list cell tiles.
  - Table Deep (`#1F1F2C`): Floating inputs, chip trays, tab bars.
  - Stroke Neutral (`#2A2A3C`): Subtle partition borders, inactive player rings.

## Typography
Typographic scale leverages **Cairo** for structural impact, bold numbers, and heroic banners, paired with **Tajawal** for prolonged readability across trivia question cards and chat interactions.

- **Numerals & Values**: Scores, pot counts, timer rings, and coin balances use Cairo's condensed, geometric properties to maintain clean alignment under tight constraints.
- **RTL Baseline Alignment**: All typography is calibrated for Arabic script ascenders and descenders, preventing clipping across pill chips and input bars.
- **Visual Weighting**: Headlines feature subtle gold fill gradients or soft drop-shadows on critical win/lose alerts to evoke physical marquee signage.

## Layout & Spacing
A 390px mobile-first standard built around vertical thumbnail reach, compact game table visualization, and thumb-friendly action buttons.

- **Grid & Margins**: 16px (`1rem`) outer edge margins guarantee content remains comfortably clear of physical bezel edges and iOS home indicators.
- **Table Felt Arena**: The central gaming arena occupies the upper two-thirds of the viewport, with avatars distributed radially along an oval coordinate boundary.
- **Tactical Action Bar**: Fixed to the viewport bottom with 12px padding, accommodating high-frequency, high-stakes decision buttons (Fold, Check, Raise, All-In).

## Elevation & Depth
Depth separates passive spectator space from immediate tactical layers through low ambient floor lighting and warm gold luminescence.

- **Level 1 (Felt Ground)**: Base charcoal `#0D0D11` accented with central radial table gradients (`rgba(180, 83, 9, 0.08)` to dark edges).
- **Level 2 (Containers & Plates)**: `#16161E` with a 1px border stroke of `#2A2A3C` and soft drop-shadow: `0 4px 12px rgba(0, 0, 0, 0.5)`.
- **Level 3 (Interactive Cards & Drawers)**: `#1F1F2C` trimmed with metallic dual-stroke illusion (outer 1px `#D4AF37` at 40% opacity, inner 1px highlight `rgba(255, 255, 255, 0.08)`).
- **Level 4 (Hero CTAs & Timers)**: Ambient golden glow: `0 0 20px rgba(245, 196, 67, 0.35)` and `0 4px 8px rgba(0, 0, 0, 0.6)`. Active countdown timers transition to `#EF4444` ambient pulses when duration drops under 5 seconds.

## Shapes
Forms draw from luxury poker chips and smooth rounded casino tokens. Elements use an 8px (`0.5rem`) base radius, expanding to 16px (`1rem`) for modals and parchment cards, with avatars and coin indicators retaining perfect circles.

## Components

### Buttons & Action Triggers
- **Primary Hero CTA**: Linear gradient from `#FDE68A` (top) through `#F5C443` to `#E5A93C` (bottom). Bold Cairo typography in `#0D0D11`. Subtle top inner border (`1px solid rgba(255,255,255,0.4)`), soft gold outer glow.
- **Fold Button**: Solid `#EF4444` background with white icon/typography. On active press, darkens to `#B91C1C` with an inset shadow.
- **Check / Call Button**: Deep cobalt `#3B82F6` with chip value displayed in a secondary white pill badge.
- **Raise / All-In Button**: Vibrant `#10B981` with gold highlight borders denoting aggressive betting power.

### Trivia Clue & Secret Cards
- **Styling**: Styled as aged parchment or matte-finish black VIP playing cards. Borders feature double-line 1px metallic gold filigree accents (`#D4AF37`).
- **Secret Ranges**: Range disclosures (e.g., `30,000,000 – 40,000,000`) sit within recessed obsidian plaques (`#0A0A0F`) with yellow highlight text to simulate card foil print.

### Player Avatars & Seats
- **Rings**: Circular avatars bounded by a 2px state ring:
  - Gold (`#F5C443`) for current turn player.
  - Green (`#10B981`) for "Ready" / "Called".
  - Faded Gray (`#4B5563`) for disconnected or folded seats.
- **Bet Badges**: Floating pill beneath the avatar showing chip icon and formatted numeric value on a `#0D0D11` background with gold border.

### Keypads & Input Fields
- **Numeric Guess Keypad**: Discrete dark keys (`#1F1F2C`) with gold hover states and high-contrast numerals (`Cairo Bold 20px`).
- **Answer Input Display**: Large right-to-left numeral readout in an inset `#0A0A0E` frame with golden focus aura.

### Lists & Leaderboards
- **Leaderboard Rows**: Rounded 12px pill strips. Top 3 ranks feature metallic badge pins (Gold `#F5C443`, Silver `#E2E8F0`, Bronze `#CD7F32`).
- **Row Styling**: Alternating background tints with `#16161E` base, 1px divider lines, and gold right-aligned point totals.