# Kashew Design System

Warm, calm, editorial SaaS. Cream canvas, white cards, deep forest-green brand, lime highlight. Generous whitespace, big tight headings, soft rounded cards with hairline borders. Clean, never busy.

**Rules for anyone (human or AI) building UI:**
1. Use semantic tokens only (`bg-background`, `text-foreground`, `bg-primary`, `border-border`). Never hard-code hex/oklch in components.
2. Tokens live in `theme.css`. Import it; do not redefine.
3. Stack: Tailwind v4, shadcn/ui components, Phosphor icons, Fustat font.
4. If something is not covered here, pick the simplest option that matches the patterns below. Do not invent new colours.

---

## 1. Colour

| Role | Token | Light value | Use |
|---|---|---|---|
| Page canvas | `background` | oklch(0.955 0.015 85), warm cream | Page background |
| Card / popover | `card` | oklch(0.995 0.003 90), near-white | Cards, modals, dropdowns |
| Text | `foreground` | oklch(0.22 0.02 75), warm near-black | Body and headings |
| Secondary text | `muted-foreground` | oklch(0.5 0.015 75) | Labels, captions |
| Brand / CTA | `primary` | oklch(0.32 0.06 160), deep forest green | Primary buttons, links, focus, stat bands |
| Highlight | `secondary` | oklch(0.8905 0.1208 122.22), lime | Small accents, tags, gradients |
| Subtle fill | `muted`, `accent` | cream tints | Progress tracks, hover, code blocks |
| Border | `border`, `input` | oklch(0.915 0.01 85) | Every card, divider, input |
| Danger | `destructive` | coral red | Delete, errors |
| Success | `success` | green | Verified, saved |

- **Dark mode:** neutral cool grey (no green tint). `primary` stays green. Toggle with `.dark` on `<html>`.
- **Charts:** `chart-1` coral, `chart-2` forest, `chart-3` lime-gold, `chart-4` plum, `chart-5` sand. Use in that order.
- **Status chips:** `status-win | loss | proposal | negotiation | scope` (+ `-foreground` for text on it).
- **Account types:** `type-enterprise | midmarket | smb | prospect` (+ `-foreground`).
- **Tints:** use opacity on tokens, not new colours: `bg-primary/10 text-primary`, `ring-primary/30`, `text-foreground/70`.

## 2. Typography

- **Font:** Fustat (Google Fonts), fallback `ui-sans-serif, system-ui`. Load via `next/font/google` or a `<link>`. Mono: system mono.
- **Hero / section headings:** `text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.12]`, black or `text-foreground`, centred, often `text-balance`.
- **Subheading / lead paragraph:** `text-foreground/70 text-sm sm:text-lg md:text-xl lg:text-2xl leading-relaxed`, `max-w-3xl mx-auto`.
- **Card title:** `text-lg sm:text-xl font-semibold leading-tight truncate`.
- **Body:** `text-sm sm:text-base`.
- **Field label (eyebrow):** `text-xs font-medium text-muted-foreground uppercase tracking-wide`.
- **Big stat number:** `text-3xl → lg:text-6xl font-extrabold tracking-tight leading-none tabular-nums`; the unit (x, %) is `text-[0.55em] font-semibold`.
- **Stat label:** `text-xs → lg:text-base font-semibold uppercase tracking-widest` at `text-white/50` on green.

## 3. Shape, spacing, depth

- **Radius:** base `--radius: 0.75rem`. Cards `rounded-2xl`; large hero/stat bands `rounded-2xl sm:rounded-3xl`; chips `rounded`; pills and bars `rounded-full`.
- **Borders:** always `border border-border` (hairline). Depth comes from border + soft shadow, not heavy shadows.
- **Highlighted card:** add `ring-1 ring-primary/30` and an overlay `bg-linear-to-br from-primary/5 to-primary/2`.
- **Layout width:** sections `max-w-7xl mx-auto`; tight content `max-w-4xl`; stat band `max-w-[1150px]`.
- **Padding rhythm:** page `px-4 sm:px-6 md:px-8`; section `py-14 sm:py-20 md:py-28`; card `p-4 sm:p-6`; header-to-content `mb-8 sm:mb-10 md:mb-14`.
- **Dividers:** `h-px bg-border`.
- **Motion:** subtle fade/slide-in (opacity and a few px of translate). No bouncy animation.

## 4. Components (patterns)

**Card:** `rounded-2xl border border-border bg-card overflow-hidden shadow`. A "window" variant adds a top bar `flex items-center gap-1.5 px-4 py-2.5 border-b border-border` with three 10px dots `#FF5F57`, `#FEBC2E`, `#28C840`.

**Primary button:** `bg-primary text-primary-foreground rounded-xl` (the green CTA), hover slightly lighter. Secondary: lime `bg-secondary text-secondary-foreground`. Ghost: transparent with `hover:bg-accent`.

**Inline highlight badge:** `inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold` (icon `w-3 h-3`).

**Stat band (dark green section):** `rounded-2xl sm:rounded-3xl` with `background: var(--primary); color: white`, overlaid with a faint grid: `linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.06) 1px, transparent 1px)` at `background-size: 80px 80px`. 2 columns on mobile, 4 on desktop, centred; number, uppercase label (`white/50`), description (`white/60`).

**Progress / score bar:** track `h-1.5 bg-muted rounded-full`, fill `rounded-full` with `var(--chart-5)` (or a status colour). Value beside it: bold number plus `/100`.

**Data field:** eyebrow label above value; email shown underlined with `underline-offset-2`; verified = small green check icon (`text-green-500`).

**Hero background:** a vertical gradient from transparent, through light lime (rgb(205, 232, 140)) at 50%, to a deeper green at the bottom. Exact end colour: copy from the hero component.

**Icons:** Phosphor (regular weight, 256 viewBox, `fill="currentColor"`). Sizes 16 to 20px in UI, `w-3 h-3` inside badges. Colour with `text-primary` or `text-muted-foreground`.

**Scrollbar:** 6px, thumb `primary`, hover `chart-4` (already in `theme.css`).
