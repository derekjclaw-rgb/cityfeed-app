# MAP-V1 — Map-First Discovery (Spec)

**Status:** Ready to build — scheduled post shipping-flow test (post CTO Round 2)
**Scope:** Upgrade the existing map view mode. Toggle stays. No marketplace layout revolution.
**References:** Zillow mobile map (map-first discovery), Airbnb (search-gated map entry; desktop split view — V2 only)

**Decisions (Michael, Aug 24):**
1. **Search-gated map (Airbnb play):** grid is the default; full map view requires a
   search/location first. New company — let visitors browse tiles + about pages and
   get a feel for what City Feed does before dropping them on a map.
2. **Tap-only in V1** — swipe carousel confirmed for V2 ("that part is cool" —
   it's coming, just not first)
3. Result count copy: **"23 results"** (not "spots available")
4. **No category pill bar in map mode** — categories fold into the filter button
   (with active-count badge). Pill strip stays on GRID view only, where it earns
   its keep as category education for a new brand.

---

## Why

For City Feed, location IS the spec sheet. Advertisers discover within a market
("what's available in Vegas"), which is the Zillow pattern, not the Airbnb pattern.
The map should feel like the product, not a secondary view boxed inside page padding.

---

## V1 Scope (one batch day)

### Mobile — map mode becomes full-bleed, Zillow-style

**Entry (search-gated)**
- Grid stays the default marketplace view
- Map toggle stays visible; tapping Map with NO search/location set focuses the
  search input with hint copy ("Search a city to explore the map") instead of
  opening an empty-continent map
- Once a search/category/location is set → map mode opens centered on the result set
- Map opens pre-filtered to the query; search bar shows the active query, not placeholder

**Layout**
- Map goes edge-to-edge: full viewport width/height under the site header
  (remove page padding + rounded-card container in map mode)
- Search bar + filter controls FLOAT over the map (top), pill-style, white bg, shadow
  - Search input (existing search state, same behavior)
  - Filter/sliders button with active-filter count badge (e.g. ②) — categories,
    price, etc. all live here in map mode (no pill strip over the map)
- Small floating circular controls (bottom-left, above sheet): locate-me (map.flyTo on
  geolocation), optional style toggle later

**State A — browsing (no pin selected)**
- Collapsed bottom sheet pinned to bottom: white, rounded-top, grabber bar,
  centered result count — "23 results"
- V1: tapping the sheet (or grabber) switches to grid view (same as toggle).
  It is a *preview* of the V2 draggable sheet — build it as a component
  (`MapBottomSheet`) so V2 can add drag gestures without rework.

**State B — pin selected (floating tile)**
- Tapping a price pin shows a floating listing card docked above the bottom sheet
  (NOT anchored to the pin — kills the current popup edge-clipping problem)
- Card: image (or gradient placeholder), category chip, favorite heart, title,
  city/state, $/day in gold, rating, "View listing →" CTA
- V1 is tap-only: card shows the tapped pin's listing; tap another pin to switch.
  Build the card so a swipe handler can bolt on later (V2 adds horizontal swipe →
  next/prev nearby listing, highlighted pin follows — drop the carousel dots until then)
- Selected pin state: gold fill (unselected pins stay mint), slight scale-up
- Tap empty map or ✕ dismisses card
- Card animates in with slide-up + fade (~200ms, ease-out)

### Desktop — map mode gets full-height treatment
- Map fills viewport height below site header (calc(100vh - header)), full width
- Floating search pill top-left (query + filter button w/ badge); floating
  "Show list" button top-right returns to grid; zoom controls right edge
- Result-count chip floats bottom-center ("23 results · Las Vegas, NV")
- Pin click keeps a pin-anchored popup on desktop (edge clipping is a mobile
  problem), restyled to the shared MapListingCard component w/ pointer tail

### Both platforms
- Result count always visible in map mode (map should feel like a query, not a picture)
- **Viewport-aware count (V1 nicety, decided Aug 24):** on `moveend`, read map bounds
  and recount loaded listings within them client-side — count chip updates as you
  pan/zoom. ~10 lines, no server work at current listing volume. (Full Zillow
  behavior — panel re-rendering to viewport + hover↔pin sync — stays in V2.)
- Map reflects active search/category filters (already true — keep it)
- Keep map instance warm between grid/map toggles (don't tear down Mapbox GL on
  toggle; hide container instead). Saves Mapbox loads + feels instant.

---

## Components

- `MapBottomSheet` — collapsed sheet w/ result count (V2-ready)
- `MapListingCard` — floating tile (shared: mobile card + desktop popup restyle)
- `MapFloatingSearch` — search + filter pills overlay
- Pin rendering stays inline in `MapView` (extract only if it gets hairy)

## Map style (decided Aug 24 — Michael)
- **V1 style: `mapbox://styles/mapbox/outdoors-v12`** (replaces light-v11) — greenery,
  terrain shading, richer sense of place. One-line swap in MapView.
- Comparison mock: mockups/map-v1/compare.png (light-v11 vs streets-v12 vs outdoors-v12)
- Known trade-off: outdoors is tuned for recreation — landmark/commercial POI labels
  are weaker than streets-v12/standard. Acceptable for V1; revisit if advertisers
  ask "where's the Bellagio" on the map.
- Pin adjustments for richer basemap: keep 2px white borders, consider +1px font
  size / slightly larger pill so pins stay the loudest layer.
- **V2: custom Mapbox Studio style** (the Airbnb move) — duplicate outdoors-v12 on
  the derekjclaw account, brand-tune: cream land tint, keep parks green, boost
  landmark labels, mute road colors, strip clutter. Publishes as
  mapbox://styles/derekjclaw/xxxx. Free.
- Note: GL JS is v3.20 so mapbox/standard (3D landmarks) is also available if we
  ever want the showpiece look — parked, not chosen.

## Design tokens
- Pins: mint #7ecfc0 bg, white 2px border, white bold price text, shadow
- Selected pin: gold #debb73, scale 1.1
- Card/sheet: white, 16-20px radius, subtle border #e0e0d8, charcoal text,
  gold price + CTA, cream page accents. Light-v11 Mapbox style (unchanged).

---

## Explicitly OUT of V1 (→ V2, post-launch)
- Swipe carousel on the mobile floating tile (nearest-pin ordering + gesture handling)
- Draggable bottom sheet replacing the toggle on mobile
- **Desktop split view (Zillow pattern — Michael's preferred V2 direction, Aug 24):**
  map LEFT (~55%), live results panel RIGHT (2-up card grid, independent scroll);
  filter dropdowns promoted to a real toolbar row (Category / Price / Dates /
  Filters ② + gold "Save search"); dark count chip ON the map ("23 results");
  pin popup box KEPT on the map; selected pin ↔ highlighted card sync both ways.
  Mock: mockups/map-v1/desktop-split.png
- "Search as I move the map" (viewport-bound re-query)
- Marker clustering (needed at ~50+ listings per metro)
- Saved-search / map style switcher

## Open questions for Michael
1. ~~Default view~~ — ANSWERED: grid default, map requires search first (Airbnb pattern)
2. ~~Swipe vs tap~~ — ANSWERED: tap-only V1, swipe carousel V2
3. ~~Count copy~~ — ANSWERED: "23 results"

**All open questions resolved — spec is build-ready.**

## Estimate
- Mobile full-bleed + floating search + card + sheet: ~half day
- Desktop full-height + popup restyle + warm map instance: ~quarter day
- Fits one batch day with testing margin.

## Mockups
Visual mocks (2 mobile states) generated 2026-08-24, in workspace:
`~/.openclaw/workspace/mockups/map-v1/`
