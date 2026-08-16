# Batch 3 Changes — Date bug, Listings UX, MP4

Date: 2026-08-16

---

## FIX 1 — Date off-by-one bug

### Root cause
`new Date('YYYY-MM-DD')` (date-only ISO string, no time part) is parsed by the
JavaScript engine as **UTC midnight**. In America/Los_Angeles (UTC-7/UTC-8) that
lands at 5 pm or 4 pm the *previous* calendar day, so `toLocaleDateString()`
renders the date one day earlier than intended.

The fix is to always append `T00:00:00` (no timezone suffix) when constructing a
`Date` from a date-only string, forcing local-midnight parsing. `lib/fees.ts`
already exported `parseBookingDate` and `formatBookingDate` for this purpose.

### Files changed

**`app/booking/success/page.tsx`**
- Imported `formatBookingDate` from `@/lib/fees`.
- Replaced two bare `new Date(booking.start_date/end_date).toLocaleDateString()`
  calls on the confirmation page with `formatBookingDate(...)`.

**`app/dashboard/bookings/[id]/page.tsx`**
- Added `formatBookingDate` to the existing `@/lib/fees` import.
- Fixed the local `fmt()` helper: for date-only strings it now delegates to
  `formatBookingDate` (which appends `T00:00:00`); ISO timestamps still use bare
  `new Date()`.
- This surfaces on the Booking Details card ("Start date" / "End date" rows)
  displayed to both host and advertiser.

### Files already correct (no change needed)
- `lib/fees.ts` — `parseBookingDate`, `formatBookingDate`, `bookingDays` all
  correctly append `T00:00:00`.
- `lib/admin-finance.ts` — `formatDate` already delegates to `parseBookingDate`
  for date-only strings.
- `lib/email.ts` — `formatDateShort` already appends `T00:00:00`.
- `app/dashboard/bookings/page.tsx` — bookings list already uses `formatBookingDate`.
- `app/dashboard/bookings/[id]/receipt/page.tsx` — already uses `parseBookingDate`.
- `app/dashboard/transactions/page.tsx` — already appends `T00:00:00`.
- `app/dashboard/listings/page.tsx` — booking schedule rows already append
  `T00:00:00`.
- Admin pages — already use `formatDate` from `lib/admin-finance`.

### DATE-AUDIT notes (duration / inclusive-range check)
The app stores dates as [start_date, end_date) — end_date is the day *after* the
last campaign day (exclusive upper bound). `bookingDays` computes
`ceil((end − start) / 1 day)`, so a booking with start = Aug 17, end = Aug 19
yields **2 days** and the UI displays "Aug 17 → Aug 19". This matches checkout
pricing and is internally consistent; the display convention (showing the
exclusive end date) is a product decision, not a calculation error. Duration and
pricing logic were **not changed**.

The comparison `new Date(endDate)` (UTC-parsed) in `BookingProgressBar` could
cause the "is campaign live?" check to flip up to 8 hours early on the final day
in US timezones. This affects the live/complete status indicator only, not date
text. Left unchanged per task scope (comparison logic, not display).

---

## FIX 2 — My Listings page

### (a) Dropdown overflow clipping
**Root cause:** The listing card outer `<div>` carried Tailwind's
`overflow-hidden` class (needed historically to clip the card image to rounded
corners). Any absolutely-positioned child that overflows the card boundary —
specifically the options dropdown menu — was silently clipped by the browser.

**Fix:** Removed `overflow-hidden` from the card outer div. Added
`rounded-t-2xl` (and kept `overflow-hidden`) on the image container `<div>` so
the thumbnail is still correctly masked. The menu is now rendered with `z-50`
for reliable stacking above sibling cards.

### (b) Unpublish action
- Added `handleUnpublish(id)` function.
- Queries `bookings` for the listing filtered to status in
  `(pending, confirmed, active, pop_pending, pop_review)` with `end_date >= today`.
- If any exist: sets `unpublishErrors[id]` and returns without calling Supabase.
  The error renders inline below the listing title as a gold-tinted notice.
- If none exist: sets `status = 'inactive'` on the listing row and updates local
  state so the card moves to the Inactive section without a page reload.
- "Unpublish" menu item only appears for listings where `status === 'active'`.

### (c) Active / Inactive section grouping
- Listings are split into `activeListings` (`status === 'active'`) and
  `inactiveListings` (everything else: pending, inactive, rejected).
- Both sections render under a heading ("Active listings" / "Inactive listings")
  using the same card grid and card design.
- The Inactive section is hidden entirely when empty.

**File changed:** `app/dashboard/listings/page.tsx`
- Added `EyeOff` lucide import.
- Added `unpublishingId` and `unpublishErrors` state.
- Added `handleUnpublish` function.
- Refactored card into `ListingCard` sub-component for reuse across sections.
- Applied overflow fix, z-index, and Unpublish menu item.
- Added inline error display.
- Wrapped grid in Active / Inactive section headers.

---

## FIX 3 — MP4 accepted format in listing forms

`CREATIVE_FORMATS` arrays in the create-listing and edit-listing form were
`['PDF', 'JPG', 'PNG']`. MP4 was previously removed (see commit
`a1d62ed`). Adding it back here as requested.

The booking detail page (`app/dashboard/bookings/[id]/page.tsx`) already accepted
MP4 in `ACCEPTED_FORMATS`, the collateral upload input, and the creative-specs
display — no changes needed there.

### Files changed
- **`app/dashboard/create-listing/page.tsx`** — `CREATIVE_FORMATS` → `['PDF', 'JPG', 'PNG', 'MP4']`
- **`app/dashboard/listings/[id]/edit/page.tsx`** — same change

---

## TypeScript check
`npx tsc --noEmit` exits 0 — no type errors introduced.

---

## Risks / notes
- **Listings page nested component:** `ListingCard` is defined inside
  `MyListingsPage`. React creates a new component reference each parent render,
  causing full unmount/remount of card elements. There is no local state in
  `ListingCard` so this causes no visible bug or data loss, only a minor
  performance cost. Refactoring it to a top-level component would be a clean-up
  to do in a future pass.
- **Unpublish writes directly to `listings.status`:** Supabase RLS must allow the
  row owner to update their own listing's status field. This should already be in
  place since the edit flow uses the same table.
- **MP4 re-addition:** Check that the Supabase collateral storage bucket and any
  server-side upload validation also accept `video/mp4`. The `/api/collateral/upload`
  route should be verified if upload failures occur.
