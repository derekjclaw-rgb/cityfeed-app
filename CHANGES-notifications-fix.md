# Notifications & Email Fix — Attempt 3

**Date:** 2026-08-01  
**Status:** ✅ Complete — build passes

## Changes Made

### 1. Email Deep Links (`lib/email.ts`)

All email CTA buttons now deep-link to the specific booking page when `bookingId` is available:

| Email Type | Old Link | New Link |
|---|---|---|
| `new_booking_request` | `/dashboard/bookings` | `/dashboard/bookings/${bookingId}` |
| `new_booking_instant` | `/dashboard/bookings` | `/dashboard/bookings/${bookingId}` |
| `booking_confirmed` | `/dashboard/bookings` | `/dashboard/bookings/${bookingId}` |
| `booking_request_submitted` | `/dashboard/bookings` | `/dashboard/bookings/${bookingId}` |
| `booking_cancelled` | `/dashboard/bookings` | `/dashboard/bookings/${bookingId}` |
| `pop_approved` | `/dashboard` | `/dashboard/bookings/${bookingId}` |

All links gracefully fall back to `/dashboard/bookings` when no bookingId is provided. Updated `EmailEvent` type to add optional `bookingId` to `booking_cancelled` and `pop_approved`.

### 2. Next Step Callout (`app/dashboard/bookings/[id]/page.tsx`)

Added `NextStepCallout` component rendered after the progress bar, role-aware based on host vs advertiser:

**Advertiser view:**
- `confirmed` → "Upload your creative file to get started"
- `confirmed`/`active` + creative uploaded → "Your campaign is live — proof of posting coming soon"
- `pop_pending` → "Proof of posting submitted — under review"
- `completed` → "Campaign complete — leave a review"

**Host view:**
- `confirmed` → "Awaiting creative files from the advertiser"
- `confirmed`/`active` + creative received → "Upload proof of posting to confirm placement"
- `pop_pending` → "Proof submitted — awaiting review"
- `completed` → "Campaign complete — payout processed"

**Style:** Light mint background (`rgba(126,207,192,0.08)`), 3px solid left border `#7ecfc0`, 13px text, inline style objects.

### 3. Creative Upload Notifications (already existed)

Verified the creative upload handler in `CollateralSection.handleUpload` already:
- ✅ Inserts notification for HOST (`collateral_uploaded`)
- ✅ Inserts notification for ADVERTISER (`creative_submitted`)
- ✅ Sends email to HOST (`collateral_uploaded` type)
- ✅ Sends email to ADVERTISER (`creative_submitted_advertiser` type)

No changes needed — these were already implemented.

### 4. POP Submission Notifications

**`app/dashboard/bookings/[id]/page.tsx` — `handleSubmitPOP`:**
- Added HOST notification insert (`pop_submitted` type) confirming POP submitted + payout incoming
- Added HOST email via `/api/email/send` using new `pop_submitted_host` type

**`lib/email.ts`:**
- Added new email event type `pop_submitted_host` with branded template confirming POP submission, payout timeline, and deep-link CTA

**`app/api/stripe/payout/route.ts`:**
- Added notification insert for HOST (`payout_initiated` type) confirming payout amount and linking to booking

## Files Modified

1. `lib/email.ts` — Deep links + new `pop_submitted_host` email type
2. `app/dashboard/bookings/[id]/page.tsx` — NextStepCallout component + host POP notifications
3. `app/api/stripe/payout/route.ts` — Host payout notification

## Build Verification

```
npx next build → ✅ SUCCESS (no errors)
```
