---
name: Club dei clubbers
description: The group's door list for nights out. Night-blue ground, chalk type, and marker inks for in, maybe and no.
colors:
  night: "#0b1130"
  night-raised: "#121a3c"
  night-raised-2: "#1a2450"
  night-raised-3: "#253064"
  chalk: "#f3f1ec"
  chalk-muted: "#aab3d6"
  chalk-faint: "#7c87b3"
  hairline: "rgba(214, 222, 255, 0.11)"
  hairline-strong: "rgba(214, 222, 255, 0.22)"
  marker-green: "#48e28b"
  marker-green-ink: "#06281a"
  marker-yellow: "#ffd34a"
  marker-yellow-ink: "#2c2100"
  marker-red: "#ff6a5f"
  marker-red-ink: "#2e0703"
  scrim: "rgba(4, 7, 24, 0.68)"
  day-paper: "#eef0f6"
  day-raised: "#ffffff"
  day-raised-2: "#e2e6f1"
  day-raised-3: "#d2d8ea"
  day-ink: "#0b1130"
  day-muted: "#48517a"
  day-faint: "#5a6390"
  day-hairline: "rgba(11, 17, 48, 0.1)"
  day-hairline-strong: "rgba(11, 17, 48, 0.22)"
  day-green: "#0a7343"
  day-yellow: "#8a6100"
  day-red: "#b8291f"
typography:
  display:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "40px"
    fontWeight: 800
    lineHeight: 0.92
    fontVariation: "\"wdth\" 62"
    fontFeature: "\"tnum\" 1, \"lnum\" 1"
  display-md:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 800
    lineHeight: 1
    fontVariation: "\"wdth\" 72"
  display-sm:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "27px"
    fontWeight: 800
    lineHeight: 1.1
    fontVariation: "\"wdth\" 72"
  numeral:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "56px"
    fontWeight: 800
    lineHeight: 0.8
    fontVariation: "\"wdth\" 62"
    fontFeature: "\"tnum\" 1, \"lnum\" 1"
  headline:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "23px"
    fontWeight: 800
    lineHeight: 1
    fontVariation: "\"wdth\" 72"
  title-card:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "25px"
    fontWeight: 800
    lineHeight: 0.98
    fontVariation: "\"wdth\" 62"
  title:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 800
    lineHeight: 1.02
    fontVariation: "\"wdth\" 72"
  title-compact:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 800
    lineHeight: 1.1
    fontVariation: "\"wdth\" 72"
  name:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.2
    fontVariation: "\"wdth\" 72"
  body:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.45
  control-lg:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.3
  control:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.35
  meta:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.4
  caption:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.35
  tab-label:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.2
rounded:
  tag: "6px"
  thumb: "8px"
  sm: "10px"
  md: "12px"
  lg: "14px"
  panel: "18px"
  sheet: "22px"
  pill: "999px"
spacing:
  chip-gap: "8px"
  row: "12px"
  gutter: "16px"
  block: "32px"
  section: "40px"
components:
  button-primary:
    backgroundColor: "{colors.chalk}"
    textColor: "{colors.night}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 16px"
  button-going:
    backgroundColor: "{colors.marker-green}"
    textColor: "{colors.marker-green-ink}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 16px"
  button-outline:
    textColor: "{colors.chalk}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 16px"
  rsvp-in:
    backgroundColor: "{colors.chalk}"
    textColor: "{colors.night}"
    rounded: "{rounded.lg}"
    height: "52px"
  rsvp-in-selected:
    backgroundColor: "{colors.marker-green}"
    textColor: "{colors.marker-green-ink}"
    rounded: "{rounded.lg}"
    height: "52px"
  rsvp-maybe-selected:
    backgroundColor: "{colors.marker-yellow}"
    textColor: "{colors.marker-yellow-ink}"
    rounded: "{rounded.lg}"
    height: "52px"
  rsvp-no-selected:
    backgroundColor: "{colors.marker-red}"
    textColor: "{colors.marker-red-ink}"
    rounded: "{rounded.lg}"
    height: "52px"
  chip:
    textColor: "{colors.chalk}"
    rounded: "{rounded.pill}"
    height: "36px"
    padding: "0 14px"
  chip-active:
    backgroundColor: "{colors.chalk}"
    textColor: "{colors.night}"
    rounded: "{rounded.pill}"
    height: "36px"
    padding: "0 14px"
  input:
    backgroundColor: "{colors.night-raised}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.md}"
    padding: "0 16px"
  guest-list:
    backgroundColor: "{colors.night-raised}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.panel}"
    padding: "20px 16px 16px"
  sheet:
    backgroundColor: "{colors.night-raised}"
    rounded: "{rounded.sheet}"
  tab-bar:
    backgroundColor: "{colors.night}"
    textColor: "{colors.chalk-faint}"
    height: "64px"
  propose-button:
    backgroundColor: "{colors.chalk}"
    textColor: "{colors.night}"
    rounded: "{rounded.lg}"
    size: "48px"
---

# Design System: Club dei clubbers

## Overview

**Creative North Star: "The Door List"**

Every event is the guest list at a club door, read at night. The friends who are in come first, ticked in marker with their +1, and the poster follows whole beneath. The board is a stack of those lists: who you are already down for, where the group is going this weekend, which nights have the longest list, what was just proposed, then the full programme by day.

The world is night blue, not black: the ground and every raised surface step through the same blue, and type is chalk white. Colour is reserved for the three marker inks, green for in, yellow for maybe, red for no, so a glance at any screen says who is going. Names, counts and titles speak in a narrow uppercase grotesk, the voice of a list written at the door; anything meant to be read as sentences stays in the phone's own face. The density is that of a well-kept list: rows and hairlines, few boxes, nothing decorative.

Motion has one authored moment: putting yourself on the list. The marker tick draws itself on the button, your face slides into the list line and your name writes into the list. Everything else responds to touch and stays quiet.

**Key Characteristics:**
- Night-blue ground and chalk type, with a full day theme for bright light.
- Three marker inks with fixed meanings, each paired with a drawn mark and a word.
- Narrow uppercase grotesk (self-hosted Archivo) for names, counts and titles; system face for reading.
- Rows and 1px hairlines instead of cards; the guest list is the one framed object.
- Posters always whole, never cropped under a gradient or overlaid with text.
- One signature motion: the tick that draws itself when you join a list.

## Colors

A night palette of blues with chalk type, where the only saturated colours are the three inks of the list.

### Primary
- **Marker Green** (in): the "in lista" ink. Ticks beside names, the selected "Sei in lista" button, the active tab marker, unread badges, the caret, text selection and focus rings. Its ink colour sits on it whenever it is a fill.

### Secondary
- **Marker Yellow** (maybe): the "Forse" ink. The circle mark and the selected "Forse" button only.

### Tertiary
- **Marker Red** (no): the "Non vengo" ink. The cross mark, struck-through names, the "Annullato" tag, destructive actions and error messages.

### Neutral
- **Night** (ground): the page and the bars at the bottom of the screen.
- **Night Raised, Raised 2, Raised 3**: sheets, the guest list panel and inputs; hover fills; avatar and switch tracks. Depth steps up in blue, never in grey.
- **Chalk**: primary text, the primary button and the propose button.
- **Chalk Muted**: secondary text, meta lines, icons in info rows.
- **Chalk Faint**: inactive tab labels, timestamps, placeholders and optional hints (AA on the ground and on raised surfaces).
- **Hairline / Hairline Strong**: row dividers and the borders of chips, outline buttons and inputs.
- **Day Paper and the day set**: the light theme. The same roles, with the inks deepened (Day Green, Day Yellow, Day Red) so text and white labels on them pass AA.

### Named Rules
**The Three Inks Rule.** Green, yellow and red mean in, maybe and no, and nothing else. A status colour never decorates, and every ink travels with its mark (tick, circle, cross) and a word, so the meaning survives without colour.

**The Night Ground Rule.** The ground is night blue, never neutral black; raised surfaces step up in the same blue, never in grey.

## Typography

**Display Font:** Archivo, variable width, self-hosted subset (with ui-sans-serif, system-ui)
**Cyrillic Display Fallback:** Roboto Flex (wdth and wght axes, Cyrillic subset via next/font/google, not preloaded): Archivo has no Cyrillic, and Roboto Flex answers the same `font-stretch` values, so Russian titles stay narrow. The stack is Archivo, then a metric-matched local fallback limited to Latin (`Archivo Fallback` in globals.css), then Roboto Flex: a fallback with Cyrillic (such as plain Arial) placed before Roboto Flex would take over every Russian title.
**Body Font:** the platform's system face (ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto)

**Character:** a compressed, heavy grotesk written in capitals, like names on a door list, against the phone's familiar reading face. Two widths of the same family set the hierarchy: 62% for titles and big numbers, 72% for names, row titles and interface headings. Tabular, lining figures throughout.

### Hierarchy
- **Display** (800, 40px, 0.92, 62% width, uppercase): the event title on the event screen.
- **Numeral** (800, 56px, 0.8, 62% width): the count of the guest list; the ranking counts use the same face at 40px.
- **Display MD** (800, 32px, 72% width): the name on a profile, profile stats and the wordmark on sign-in screens.
- **Display SM** (800, 27px, 72% width): headings of sign-in, invite and welcome screens, and the splash wordmark.
- **Headline** (800, 23px, 1, 72% width, sentence case): section headings such as "Sei in lista", "Questo weekend", "Messaggi"; page titles, sheet and dialog titles, and the wordmark in the board's top bar.
- **Title Card** (800, 25px, 0.98, 62% width, uppercase): event titles on door cards.
- **Title** (800, 19px, 1.02, 72% width, uppercase): event titles in list rows; the "in lista" word beside the guest-list count.
- **Name** (700, 18px, 72% width, uppercase): member names on the guest list and in sheets.
- **Title Compact** (800, 17px, 72% width): titles in the compact rows ("Sei in lista", ranking) and the count in the list line.
- **Control LG** (600, 16px): inputs (16px so iOS does not zoom), large buttons, the main RSVP button.
- **Body** (400, 15px, 1.45): descriptions and messages, at most 65ch.
- **Control** (600, 14px): chips, small and outline buttons, hints and secondary text.
- **Meta** (400, 13px, 1.4): date, place and attendance lines, info-row subtitles.
- **Caption** (500, 12px): timestamps, day headers, status labels, weekday initials.
- **Tab Label** (600, 11px): bottom navigation labels.

### Named Rules
**The Fifteen Steps Rule.** Every size comes from the ramp above (11, 12, 13, 14, 15, 16, 17, 18, 19, 23, 25, 27, 32, 40, 56px); no half pixels, no near-duplicates.

**The Door Voice Rule.** Names, counts and event titles are set in the narrow uppercase grotesk; interface headings use the same face in sentence case; anything read as sentences uses the system face.

## Layout

Mobile-first, one column with a 16px gutter, capped at 672px and centred on wider screens. Sections are separated by 40px with the heading closer to its content (16px) than to the section above. The board opens with a one-line summary, then "Sei in lista" rows, the "Questo weekend" rail of door cards, the "Dove vanno tutti" ranking, the "Appena proposti" rail, and "In programma" with its filters and sticky day headers. The event screen follows the door order: title, the list line (faces and "N in lista"), date, place and link rows, the poster whole, then the full guest list, actions, details and messages.

Horizontal rails snap card by card and bleed to the screen edge; with a mouse or trackpad, back and forward controls appear beside the section count. From 640px, chip rows wrap instead of scrolling and sheets become centred dialogs. A fixed tab bar (64px plus the safe area) is present on every screen except the event screen, where the RSVP bar takes its place.

### Named Rules
**The Count Comes First Rule.** On every event surface the faces and "N in lista" come before the poster: first on door cards, right under the title on the event screen.

## Elevation & Depth

Flat by default. Surfaces separate by tone (night to raised night) and 1px hairlines. Shadows exist only for things that are lifted off the board, posters and the bars and sheets that float over content, and they are always offset and soft, tinted from the night.

### Shadow Vocabulary
- **Poster lift** (`box-shadow: 0 18px 44px var(--c-shadow)`): the whole poster on the event screen.
- **Card poster** (`box-shadow: 0 8px 24px var(--c-shadow)`): posters on door cards.
- **Floating bar** (`box-shadow: 0 -10px 30px var(--c-shadow)`): the RSVP bar.
- **Sheet** (`box-shadow: 0 -12px 40px var(--c-shadow)`): bottom sheets and dialogs.
- **Propose** (`box-shadow: 0 6px 18px var(--c-shadow)`): the propose button in the tab bar.

### Named Rules
**The Flat Board Rule.** Rows, sections and lists never cast shadows; only posters and floating bars and sheets do. No glass, no blur, no glow.

## Shapes

Gently rounded and graded by size: small tags 6px, poster thumbnails 8px, small buttons and card posters 10px, buttons, inputs and the event poster 12px, the RSVP buttons and the propose button 14px, the guest list panel 18px, sheets 22px. Chips and avatars are fully round. Borders are 1px hairlines; marks are drawn strokes with round caps and joins.

### Named Rules
**The Whole Poster Rule.** Posters are shown whole: filled only when their ratio is close to 4:5, otherwise contained on the night ground. Never cropped under a gradient, never overlaid with text.

## Components

### Buttons
- **Shape:** gently rounded (10px small, 12px medium, 14px large), heights 36, 44 and 52px.
- **Primary:** chalk fill with night text; the one strong action on a screen.
- **Going:** marker green fill with its dark ink, for confirming you are in.
- **Outline / Ghost / Secondary:** hairline-strong border, transparent or raised fills; hover steps to Raised 2.
- **Danger:** red text on a 10% red tint.
- **Press / Focus:** every control scales to 0.97 on press (0.16s); focus is a 2px marker-green ring with 2px offset.

### Chips
- **Style:** fully round, 36px, hairline-strong border, chalk text, drawn category icon at 16px.
- **State:** the active chip inverts to a chalk fill with night text.

### Cards / Containers
- **Door card:** not a box. A 72vw rail item (at most 284px): the list line, the title in Title Card, a meta line, then the poster at 4:5 with the card-poster shadow.
- **Guest list panel:** Night Raised fill, hairline border, 18px corners, 20px top padding: the one framed object on the event screen.
- **Rows:** list rows sit on the ground and divide with hairlines.

### Inputs / Fields
- **Style:** Night Raised fill, hairline border, 12px corners, 16px text (no zoom on iOS), faint placeholder.
- **Focus:** the border turns marker green at 70%.
- **Error:** a red hint line under the field.

### Navigation
- **Tab bar:** solid night with a top hairline; five slots: Bacheca, Calendario, the chalk propose square, Attività, Profilo. Inactive items in Chalk Faint; the active item turns chalk with a 3px marker-green bar at the top edge. Unread counts sit in a green badge.

### RSVP bar (signature)
Fixed at the bottom of the event screen, solid night with the floating-bar shadow. Three radios: "Mettimi in lista" (wider, chalk fill; marker green with "Sei in lista" once in), "Forse" with the circle mark, "No" with the cross mark (accessible name "Non vengo"). Choosing "Mettimi in lista" draws the tick (0.42s, ease-out, `stroke-dashoffset` from 1 to 0), slides your face into the list line and writes your name into the guest list. Tapping the selected option again clears the answer.

### Marker marks
The tick, the circle and the cross are authored SVG strokes (24px grid, round caps, 2.4 to 3.4 stroke) drawn in the inks. They mark status everywhere: rows, cards, the guest list, the list sheet and the RSVP bar.

### Brand mark
Provisional: the green marker tick (`public/brand/mark.svg`), the single source of the symbol. In the app it is drawn as a silhouette in the theme's marker green (bright on night, deep on day paper); the PWA icons are rendered from the same file on night blue by `npm run icons`. Replacing that one file replaces the symbol everywhere. The wordmark is "CLUB DEI CLUBBERS" in the narrow grotesk at 62% width.

### Credit
"designed by L. Zolovkin" in Arial at 16px (line height 1.45, the `font-credit` token, used for nothing else), Chalk Faint with the name in Chalk Muted, centred and identical in every language. It appears in three places only: closing the board under the "Eventi passati" link, at the foot of Settings under the app name, and at the foot of the entry screens (sign-in, invite, welcome, password reset), 52px above the bottom safe area, with the content centred above it.

## Do's and Don'ts

### Do:
- **Do** pair every status ink with its mark and its word: tick and "Sei in lista", circle and "Forse", cross and "No".
- **Do** put the faces and "N in lista" before the poster on every event surface.
- **Do** separate rows with 1px Hairline dividers instead of boxing each item.
- **Do** set event titles uppercase in Archivo at 62% width and interface headings in sentence case at 72% width.
- **Do** keep the poster whole: fill only near 4:5, otherwise contain it on the night ground.
- **Do** keep the tick-draw for the moment someone joins a list; every other mark is static.
- **Do** theme the browser surfaces from the palette: green selection, caret and focus ring, raised-night scrollbars, tabular figures.

### Don't:
- **Don't** use emoji or Unicode glyphs as icons in the interface; use drawn Lucide icons (1.8 to 2.2 stroke) or the marker marks.
- **Don't** use glass, backdrop blur or coloured glows.
- **Don't** put a label above a heading: the category and the countdown sit beside the date or below the poster.
- **Don't** use green, yellow or red for decoration, links or emphasis.
- **Don't** use neutral black or grey grounds; raised surfaces step up in blue.
- **Don't** crop posters under a gradient or lay text over them.
