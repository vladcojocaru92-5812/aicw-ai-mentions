---
name: GEOX
description: "Free AI visibility check for small businesses, staged as a shop window after closing: night glass, white vinyl lettering, paper sheets taped on."
colors:
  navy: "#0d2b6b"
  navy-hover: "#163c8f"
  gold: "#f2c230"
  gold-hover: "#f6d25e"
  tape: "rgba(242, 194, 48, 0.62)"
  frame: "#08151f"
  glass: "#0f2a3f"
  glass-hi: "#16394f"
  glass-lo: "#0b2030"
  lamp: "rgba(255, 196, 120, 0.09)"
  vinyl: "#f4f7f9"
  vinyl-2: "#b8cad8"
  vinyl-rule: "rgba(184, 202, 216, 0.28)"
  paper: "#ffffff"
  paper-tint: "#eef2f8"
  ink-2: "#44536b"
  paper-rule: "#d5dde6"
  rule-strong: "#9fb0c0"
  field-rule: "#6b7d92"
  error: "#b42318"
typography:
  wordmark:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 800
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 125"
  display:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(36px, 4.9vw, 72px)"
    fontWeight: 800
    lineHeight: 0.98
    letterSpacing: "-0.03em"
    fontVariation: "'wdth' 108"
  headline:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(34px, 3.8vw, 54px)"
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: "-0.028em"
    fontVariation: "'wdth' 108"
  numeral:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(120px, 13vw, 188px)"
    fontWeight: 800
    lineHeight: 0.86
    letterSpacing: "-0.02em"
    fontFeature: "'tnum' 1"
    fontVariation: "'wdth' 62"
  title:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 104"
  lead:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(17px, 1.45vw, 20px)"
    fontWeight: 400
    lineHeight: 1.5
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  action:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
  label:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 800
    letterSpacing: "0.05em"
    fontVariation: "'wdth' 125"
  field-label:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
  fine:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  decal:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    letterSpacing: "0.1em"
    fontVariation: "'wdth' 125"
rounded:
  sheet: "2px"
  field: "4px"
  window: "6px"
  pill: "999px"
spacing:
  window-inset: "14px"
  gutter: "48px"
  column-gap: "72px"
  stack-gap: "48px"
  section: "112px"
  section-compact: "80px"
  sheet-offset: "56px"
  sheet-inset: "24px"
  field-gap: "16px"
components:
  button-primary:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.paper}"
    typography: "{typography.action}"
    rounded: "{rounded.pill}"
    padding: "0 26px"
    height: "54px"
  button-primary-hover:
    backgroundColor: "{colors.navy-hover}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.navy}"
    typography: "{typography.action}"
    rounded: "{rounded.pill}"
    padding: "0 26px"
    height: "54px"
  button-ghost-hover:
    backgroundColor: "{colors.paper-tint}"
  button-on-glass:
    backgroundColor: "{colors.vinyl}"
    textColor: "{colors.frame}"
    typography: "{typography.action}"
    rounded: "{rounded.pill}"
    padding: "0 26px"
    height: "54px"
  button-on-glass-hover:
    backgroundColor: "{colors.paper}"
  nav-pill:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.frame}"
    typography: "{typography.action}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "44px"
  nav-pill-hover:
    backgroundColor: "{colors.gold-hover}"
  input-field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.navy}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    padding: "0 14px"
    height: "52px"
  paper-sheet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.navy}"
    rounded: "{rounded.sheet}"
    padding: "24px"
  placard-band:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    padding: "14px 22px"
  verdict-row:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.paper}"
    padding: "14px 26px"
  tape-strip:
    backgroundColor: "{colors.tape}"
    height: "26px"
---

# Design System: GEOX

## Overview

**Creative North Star: "The Shop Window After Closing"**

The page is one pane of night window glass, seen from inside the shop after the lights are off. Deep blue-green glass fills every region inside a thin dark shopfront frame, lit from the top right by one lamp left on in the back. Headlines are white vinyl lettering applied straight to the glass. Everything a visitor reads closely or acts on is paper posted on that glass with a strip of gold tape: a grade placard, a request slip, a printed answer slip, a repair work order with a tear-off price stub, a price list with leader dots, a receipt.

Density is split by material. The glass carries one headline, one or two leads and a lot of dark space per section; the paper carries the detail at reading size, in navy ink. One typeface does all the work: Archivo, a variable grotesque, stretched wide for printed bands and labels and squeezed condensed for scores and prices, so the hierarchy comes from the width axis more than from a second family.

The confirmed rejection is the split SaaS hero with a dashboard screenshot and a row of feature cards. Nothing here is a generic card. Each sheet is a specific printed object with one job, and the score is posted the way an inspection grade card is posted in a shop window, readable from the street.

**Key Characteristics:**
- One glass surface owns every region; light appears only as paper posted on it.
- Two inks: white vinyl on glass, navy on paper.
- Archivo variable across widths 62–125: condensed numerals, wide printed labels.
- Square-cut paper (2px corners) lifted by one soft shadow and held by gold tape.
- Pill buttons in three dresses: navy on paper, gold in the masthead, vinyl on open glass.
- Motion plays once on arrival: a glare crosses the glass and the placard presses on; both are off under reduced motion.

## Colors

Night glass and white paper, with navy ink and gold tape as the only two hues that speak.

### Primary
- **Placard Navy** (#0d2b6b): the ink of every sheet. Text on paper, the grade placard's band, the "not mentioned" verdict row, primary buttons, the ghost button's ring, the heavy 2px rule that closes a list, and the focus ring inside paper. It never appears on open glass.
- **Lit Navy** (#163c8f): the primary button's hover, as if the ink caught the lamp.

### Secondary
- **Tape Gold** (#f2c230): the masthead's "Free check" pill, the 3px focus ring on glass, and text selection. The one warm signal on the glass.
- **Gold Tape** (rgba(242, 194, 48, 0.62)): the same gold, translucent, for the tape strips that hold each sheet. The glass shows through it.
- **Pale Tape Gold** (#f6d25e): the nav pill's hover.

### Neutral
- **Shopfront Black** (#08151f): the frame around the glass, the page and browser theme color, and the dark text on gold and vinyl buttons.
- **Night Window Glass** (#0f2a3f): the body of the glass and the middle stop of its 115° gradient.
- **Glass Sheen** (#16394f): the upper-left stop of the glass gradient, where the street light falls.
- **Glass Shadow** (#0b2030): the lower-right stop of the glass gradient.
- **Back-Room Lamp** (rgba(255, 196, 120, 0.09)): a single warm radial glow at the top right of the glass (ellipse 60% × 40% at 88% 0%). The only warm light in the scene.
- **White Vinyl** (#f4f7f9): headlines, nav links, the decal and every strong word on glass. Also the fill of the button that sits on open glass.
- **Frosted Vinyl** (#b8cad8): leads, FAQ answers and fine print on glass.
- **Vinyl Hairline** (rgba(184, 202, 216, 0.28)): the 1px rules between sections, under the masthead, above the decal and between FAQ items.
- **Posted Paper** (#ffffff): every sheet.
- **Thumbed Paper** (#eef2f8): the ghost button's hover fill on paper.
- **Carbon Gray** (#44536b): secondary text on paper (descriptions, stamps, the "/100", stub captions).
- **Ruled Line** (#d5dde6): 1px hairlines between rows on paper and the dashed rule under a printout's header.
- **Perforation Gray** (#9fb0c0): the dashed perforation of the tear-off stub and the dotted price leaders.
- **Field Stroke** (#6b7d92): the 1.5px border of input fields on paper (about 4.2:1 on white).
- **Rejection Red** (#b42318): the only status color. Invalid-field border after the visitor has interacted.

### Named Rules
**The Glass Owns Every Region Rule.** No section switches to a light background. Every region sits on the glass gradient; light surfaces exist only as paper sheets posted on it.

**The Two Inks Rule.** On glass, text is White Vinyl or Frosted Vinyl. On paper, text is Placard Navy or Carbon Gray. Navy never letters the glass, and vinyl never prints on paper.

**The Tape Gold Rule.** Gold is tape and one glass-side signal (the masthead pill, the focus ring, selection). It never fills a sheet, never colors text, and never appears inside paper; inside paper the focus ring turns navy.

## Typography

**Display Font:** Archivo (with system-ui, sans-serif)
**Body Font:** Archivo (with system-ui, sans-serif)
**Label/Mono Font:** Archivo at 125% width; no second family

**Character:** One grotesque, self-hosted as a variable font (weight 400–800, width 62–125%), stretched and squeezed instead of paired. Wide 800 capitals read like a printed form header, condensed 800 numerals read like a grade card, and 100% width carries the reading text. In code, width is set with `font-stretch`.

### Hierarchy
- **Wordmark** (800, 26px, width 125%, -0.01em): "GEOX" in the masthead, lettered on the glass.
- **Display** (800, clamp(36px, 4.9vw, 72px), line-height 0.98, width 108%, -0.03em): the one hero headline, White Vinyl, max 16ch, balanced wrap. On phones it drops to 34px at 100% width and -0.02em.
- **Headline** (800, clamp(34px, 3.8vw, 54px), line-height 1.02, width 108%, -0.028em): section headlines on the glass, max 20ch, balanced wrap. 30px at 100% width on phones.
- **Numeral** (800, clamp(120px, 13vw, 188px), line-height 0.86, width 62%, tabular): the score on the placard. The same condensed 800 face sets every number that scores, ranks or prices: the stub's $9 (84px, 56px when stacked), list prices (48px, 40px on phones), answer ranks (26px). A trailing "/100" drops to 0.22em at 100% width in Carbon Gray.
- **Title** (700, 20px, line-height 1.2, width 104%, -0.01em): line-item heads on the work order. Price-list item names use the same voice at 22px.
- **Lead** (400, clamp(17px, 1.45vw, 20px), line-height 1.5): the paragraph under each glass headline, Frosted Vinyl, max 56ch. Strong words inside it go White Vinyl at 600. 16px on phones.
- **Body** (400, 17px, line-height 1.5): FAQ answers (max 62ch), answer-list rows, input text, nav links.
- **Body Small** (400, 16px, line-height 1.5): descriptions printed on sheets, in Carbon Gray, max 60–62ch.
- **Action** (600, 17px): every button and the nav pill.
- **Label** (800, 15px, width 125%, 0.05em, uppercase): the printed heading of a sheet ("Repair report", "Price list") and the placard band (0.04em there, 12px on phones). The verdict word on the placard uses the same voice at 22px and 0.06em; the request slip's title uses 700 at 112% width and 0.06em; the stub caption uses 13px.
- **Field Label** (600, 14px): labels above inputs on the request slip.
- **Fine** (400, 14px, line-height 1.5): reassurance and caption lines on glass, Frosted Vinyl. Printed stamps on paper go to 13px in Carbon Gray.
- **Decal** (600, 12px, width 125%, 0.1em, uppercase): the door-hours line in the footer, White Vinyl.

### Named Rules
**The Width Is the Hierarchy Rule.** Archivo's width axis carries role: 62% for numbers that score, rank or price; 104–108% for headlines and titles; 100% for reading text; 125% for the wordmark, printed labels, bands and the decal. Every number that scores or prices is condensed 800 with tabular figures.

**The Wide Caps Rule.** Uppercase appears only at 112–125% width with 0.04–0.1em tracking, and only on printed labels: a sheet's heading, the placard band, the verdict word, the stub caption, the footer decal. Headlines and reading text are never set in capitals.

## Layout

The page is one window. Shopfront Black fills the viewport; the glass sits inset 14px from every edge (6px on phones) with 6px corners and at least the viewport's height, so the frame always shows. Content lives in a centered column of min(1200px, 100% − 96px): a 48px gutter per side on wide screens, 24px per side at 960px and below, 16px per side at 560px and below.

The masthead is an 84px row (64px on phones) with the wordmark left and navigation right, closed by a Vinyl Hairline. The hero is a two-column grid, copy to sheet at 1.7fr to 1fr with a 72px gap, padded 56px above and 120px below. Each following section is open glass between Vinyl Hairlines, padded 112px top and bottom (80px at 960px and below), holding a headline and lead on the glass and at most one sheet. Side-by-side sections split 1.05fr to 1fr; the FAQ splits 1fr to 1.6fr; both use the 72px gap. A sheet that follows a full-width headline drops 56px below the lead. The closing call to action is centered with 96px of padding.

At 960px every two-column grid collapses to one column with a 48px gap, and the hero placard caps at 380px. At 560px the hero reorders so the placard sits between the headline and the lead as a compact strip, the slip stacks its fields, and the masthead keeps only the wordmark and the gold pill.

Spacing inside sheets runs 24–28px (32px on the receipt, 18–20px on phones); fields sit 16px apart; copy blocks stack at 14–22px.

**The One Sheet per Section Rule.** A section holds one headline and its lead on the glass and at most one paper sheet. The glass between sections stays empty except for the hairline that divides them.

## Elevation & Depth

Depth comes from one physical fact: paper hangs a little off the glass. The glass itself is flat, shaded only by its 115° gradient (Glass Sheen to Night Window Glass to Glass Shadow) and the lamp glow. Everything lettered on the glass (headlines, leads, the decal, FAQ rows) casts nothing. Every sheet casts the same soft drop shadow, deep and blurred, as if lit from the front by the street. A single glare band, white at 7% opacity, skewed −18°, sweeps across the first viewport once on load.

### Shadow Vocabulary
- **Paper lift** (`box-shadow: 0 18px 40px rgba(2, 10, 18, 0.42)`): every paper sheet at rest.
- **Ticket lift** (`filter: drop-shadow(0 18px 26px rgba(2, 10, 18, 0.42))`): the work order, whose punched notches are cut with a mask that would clip a box shadow. Same depth, applied to the silhouette.
- **Press-on lift** (`box-shadow: 0 34px 60px rgba(2, 10, 18, 0.5)`): the placard's starting point as it is pressed onto the glass on load (from 8px higher and 3% larger, 0.8s), settling into the paper lift.

**The Paper Lifts, Glass Stays Flat Rule.** Only paper casts a shadow, and every sheet casts the same one. Lettering on the glass never gets a shadow, glow or outline, and no shadow is a hard offset.

## Shapes

Paper is square-cut: every sheet has 2px corners, enough to read as a trimmed edge and no more. Input fields soften to 4px; the glass pane itself to 6px. Buttons and the nav pill are full pills (999px), the only round shapes in the system, so an action is never mistaken for a sheet.

Two sheets tilt slightly as if posted by hand: the grade placard (1.4°) and the answer printout (−0.8°). Forms, the work order, the price list and the receipt hang square. The work order is the one silhouette with a cut: two 12px half-circle notches punched top and bottom where the tear-off stub meets the order, joined by a 2px dashed perforation in Perforation Gray.

Lines on paper follow print conventions: 1px Ruled Line between rows, a 1px dashed Ruled Line under a printout's header, a 2px solid navy rule that closes a list into a total or a note, a 3px dotted Perforation Gray leader between an item and its price.

**The Square-Cut Paper Rule.** Sheets keep 2px corners and never round further; actions are always full pills. Nothing sits between those two shapes except inputs (4px) and the window itself (6px).

**The Tape Rule.** One strip of Gold Tape holds each sheet; the grade placard, the heaviest card, takes two. Each strip is 26px tall and cut to its own length (66–110px) and angle (between −33° and +11°), and overhangs a corner or the top edge by 6–15px. On phones the strips shrink to 20px tall and 52–70px long and flatten to within ±7°, so none reaches the lettering around the sheet. Tape belongs on the sheet's edge and never crosses copy on the glass.

## Components

### Buttons
Rounded, solid and plain: a full pill that reads as a press-on label against square paper.
- **Shape:** full pill (999px), 54px tall, 26px side padding, Action type (600, 17px).
- **Primary:** Placard Navy fill with Posted Paper text. The one solid action on a sheet: "Check my visibility for free" on the slip, the $9 offer on the price list.
- **Hover / Focus:** fill shifts to Lit Navy over 0.2s on the house ease. Focus is a 3px ring offset 3px: navy inside paper, Tape Gold on glass.
- **Ghost:** transparent with a 2px inset navy ring and navy text; hovers to Thumbed Paper. Used for the secondary offers on the price list and "Back to home" on the receipt.
- **On glass:** White Vinyl fill with Shopfront Black text, hovering to pure white. Used only where a button stands on open glass with no sheet behind it (the closing call to action).

### Navigation
- **Masthead:** an 84px row on the glass, wordmark at left (Archivo 800, 125% width, 26px, White Vinyl), links at right 28px apart in Body (17px). Text links are underlined on hover only, with the underline offset 0.22em.
- **Nav pill:** "Free check" as a 44px Tape Gold pill with Shopfront Black Action text and 20px side padding, hovering to Pale Tape Gold. It is the only gold object that is not tape.
- **Mobile:** at 560px the row shrinks to 64px and the text links hide; the wordmark and the gold pill stay.

### Cards / Containers
There are no generic cards. Every container is a sheet of paper with a specific printed identity.
- **Corner Style:** square-cut (2px).
- **Background:** Posted Paper, with Placard Navy ink and Carbon Gray secondary text.
- **Shadow Strategy:** the paper lift (see Elevation & Depth).
- **Border:** none; the sheet's edge is the shadow and the white against the glass.
- **Internal Padding:** 24–28px, 18–20px on phones.
- **Tape:** one Gold Tape strip at an edge, per the Tape Rule.
- **Printed heading:** a sheet may print its own name at its top in Label type (800, 15px, 125% width, uppercase, navy). It names the sheet it is printed on and never introduces a headline on the glass.

### Inputs / Fields
- **Style:** 52px tall (48px on phones), Posted Paper fill, navy text at Body size, 4px corners, 14px side padding, 1.5px Field Stroke border. Placeholder in a mid slate gray (#5b6a7f, 5.5:1 on white). Field Label (600, 14px) sits 6px above.
- **Focus:** the stroke turns Placard Navy and a 2px navy outline sits 1px outside it.
- **Error:** after interaction, an invalid field's stroke turns Rejection Red. There is no disabled state in the build.

### Request Slip (signature)
The form, as a paper slip taped to the glass in the hero. Max 640px wide, 24px inside, two fields side by side 18px apart with the primary button spanning both below. Its printed title ("Free check request", 700, 15px, 112% width, uppercase, 0.06em) rewrites itself to name the offer when a visitor arrives from a price button ("Repair report request · $9"). On phones the title hides, the fields stack 12px apart, and the top padding grows to 28px to clear the tape.

### Grade Placard (signature)
The inspection grade card, the world's emblem. A paper sheet tilted 1.4° and held by two tape strips, headed by a full-width Placard Navy band in Label type (14px by 22px padding) with the card's subject at left and the business at right. Below, centered: the score in Numeral type with "/100" set small, the verdict word in wide capitals (800, 22px, 125%, 0.06em), then a two-column list of per-engine scores closed above by a 2px navy rule, and a 13px Carbon Gray stamp. On load it presses onto the glass once (0.8s). An example placard always says it is an example on its own stamp. On phones it collapses to a strip: the band (12px type, 8px by 14px padding), then the score at 64px left and the verdict at 18px right, then the example stamp on its own line at 12px; the engine list hides.

### Answer Printout (signature)
A printed AI answer slip, tilted −0.8°, max 520px, 26px inside with no bottom padding. A small Carbon Gray header ("Buyer question / Example answer") over a dashed Ruled Line, then the question as a quoted 18px 600 line, then the ranked answer: each row a condensed rank numeral (26px) in a 34px column, the brand name, and its domain in 13px Carbon Gray, divided by Ruled Lines. It ends in the verdict row: a full-bleed Placard Navy band (14px by 26px) naming the missing brand in 700 at left and "not mentioned" at right in a pale blue (#c9d6ee).

### Repair Work Order (signature)
A wide paper work order with a tear-off price stub. Main area (26px by 32px) carries a Label heading and line items in a 32% / rest grid, Title head left and Body Small description right, divided by Ruled Lines. The 168px stub on the right shows the price in condensed Numeral at 84px over a wide-caps "once" caption. Notches and a dashed perforation mark the tear line. At 960px the stub drops below the order as a row (price 56px beside the caption) and the notches go away.

### Price List (signature)
A paper price list, max 920px, flush rows with no inner cards. Each row: an item name (Title voice at 22px) joined to a condensed 48px price by a 3px dotted Perforation Gray leader, a Body Small description beneath, and the row's button at right. Rows are divided by Ruled Lines; the list ends with a note above a 2px navy rule. The middle (paid) offer takes the primary button; the others take ghost buttons.

### FAQ Disclosure
Lettered on the glass, not on paper. Each question is a row at least 64px tall in 19px 600 White Vinyl, divided by Vinyl Hairlines, with a 22px line-drawn plus at right that turns 45° into a cross when open (0.25s, house ease). Answers in Body, Frosted Vinyl, max 62ch.

### Door-Hours Decal
The footer, lettered on the glass like opening hours on a shop door: short facts in Decal type (600, 12px, 125% width, 0.1em, uppercase, White Vinyl), centered and wrapping with 28px between items, above a Vinyl Hairline.

### Receipt
The confirmation page reuses the window and masthead and posts a single square receipt sheet (max 560px, 32px inside, tape near center top) with an 800 34px heading at 108% width, a Carbon Gray line, and a ghost button home.

### Motion
One ease for everything: `cubic-bezier(0.16, 1, 0.3, 1)`, a fast start that settles softly. The glare crosses the window once (2.6s after a 0.15s pause); the placard presses on once (0.8s after 0.25s); color changes take 0.2s; the FAQ cross turns in 0.25s. Nothing loops. Under `prefers-reduced-motion: reduce` the glare is removed and the placard simply appears.

## Do's and Don'ts

### Do:
- **Do** put every light surface on paper: Posted Paper, 2px corners, the paper lift (0 18px 40px rgba(2, 10, 18, 0.42)), and its own strip of Gold Tape.
- **Do** letter headlines straight onto the glass in White Vinyl, Archivo 800 at 108% width with tight tracking (−0.03em display, −0.028em headline) and balanced wrapping.
- **Do** set every score, rank and price in Archivo 800 at 62% width with tabular figures.
- **Do** cut each tape strip to its own length (66–110px) and angle (−33° to +11°) so no two sheets are taped alike, and flatten it on phones (20px tall, within ±7°) so it stays off nearby copy.
- **Do** switch the focus ring from Tape Gold on glass to Placard Navy inside paper, 3px with a 3px offset.
- **Do** keep sheets that hold inputs, buttons or prices square; tilt only the evidence sheets (placard, printout), by 1.5° or less.
- **Do** play motion once and remove it under reduced motion.

### Don't:
- **Don't** build the split SaaS hero with a dashboard screenshot and a row of feature cards.
- **Don't** give any section a light full-width background; light exists only as paper on the glass.
- **Don't** add navy bands to sheets other than the grade placard's header and an answer slip's verdict row; other sheets print their heading as navy text.
- **Don't** use gold for text, fills inside paper, or anything other than tape, the masthead pill, the focus ring on glass and selection.
- **Don't** round sheets past 2px or square off buttons.
- **Don't** put shadows, glows or outlines on lettering on the glass, and don't use hard offset shadows anywhere.
- **Don't** let tape cross copy on the glass.
- **Don't** loop any animation.
