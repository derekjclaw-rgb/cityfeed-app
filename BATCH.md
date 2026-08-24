# BATCH — End to End Test 8.24 (Michael's flow test)

Protocol: small commits per item/group, `batch:` prefix, run in main session.
Source: 5 annotated screenshots, Telegram, Aug 24 ~1:49 PM.

## Copy / UI fixes
- [x] 1. Create listing: Category should default to "Select an option" (required placeholder),
      not Digital Billboard
- [x] 2. Create listing: remove subtext under "This placement requires printed materials"
      toggle (expanding reveals the info anyway)
- [x] 3. "Do you offer printing?" subtext is wrong ("Advertisers will print and ship their
      own materials") → "Offer the option to print advertiser materials for an added fee"
- [x] 4. Delivery instructions helper text → "Where and how should the advertiser ship or
      deliver printed materials if they choose to provide?"
- [x] 5. Edit-listing printed-materials section ≠ create flow (edit shows old radio
      "How are printed materials handled?"). Unify — CREATE flow fields are canonical.
- [x] 6. Listings dashboard: ⋮ dropdown menu clipped by card overflow
- [x] 11. Advertiser "How will your materials arrive": remove "Prefer your host to print
      for you" subtext — nothing can be done post-sale

## Bugs (investigate + fix)
- [x] 7. Cancelled booking CF-7321EB: advertiser got NO cancellation email.
      Check booking_cancelled send path (acting-party logic from Aug 23?)
- [x] 9. Advertiser booking detail: shows "Upload your creative file to get started" /
      "Upload Required" when handling = ship/deliver printed materials. Wrong state.
- [x] 10. Host booking detail: same — should read "Awaiting advertising materials"
- [x] 12a. Shipping flow: selecting delivery skipped add-tracking, jumped straight to
      upload-creative state. Advertiser stuck (CF-B98171).
- [x] 12b. No confirmation email when advertiser marks materials shipped
- [x] 12c. Remove "attach a preview" step for ship/deliver flow (for now)

## Product question (answered)
- [x] 8. Add delivery instructions to booking confirmation page — YES, scoped:
      only when placement requires shipping, inside "What happens next"

Note: 9/10/12 likely regression territory from ed4c34c (booking detail shipping-aware).

## Result: ALL 13 CLOSED — Aug 24, 8 commits (cc109e2…a8ae94e), all pushed to prod
