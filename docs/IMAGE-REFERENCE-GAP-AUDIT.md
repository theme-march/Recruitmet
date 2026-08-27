# Image Reference Gap Audit

Reviewed all 152 screens supplied in `img.zip`. The references show a legacy/mobile implementation of the same recruitment lifecycle. The useful behavior was retained while the dense form/table presentation was adapted to Orbit's responsive design system.

## Gaps corrected

- Country submenu tabs now query their actual country/stage queue instead of reusing an unfiltered file list.
- Call Center, Registration, Accounts, Documents, Flights, Exceptions, Works & Demands, Tutorials, Notifications, Administration, Master Data, Reports, and Audit/Common Services now use their own database resources.
- Added collapsible filters for identity/passport, country, status, and created date, with clear/apply actions and active-filter count.
- Added queue-specific column headings, empty states, loading feedback, 10/25/50/100 page sizes, and responsive horizontal navigation.
- Added real Works & Demands and Tutorials starter data plus authorized create APIs/forms.
- Dashboard name, date, chart, destination totals, attention queue, payments, flights, document expiry, interview, follow-up, and due-payment counts now come from MySQL.
- Corrected seeded stage names to match configured workflows (`E-Visa Stamping`, `Pre Confirm File`, `First Payment`).
- Verified desktop and 390×844 mobile layouts; verified that selecting Saudi Arabia → Medical returns only the matching live row.

## Deliberate improvements over the references

The new UI uses reusable stage queues rather than maintaining separate near-identical pages for each screenshot. This keeps validation, authorization, filtering, pagination, exports, and audit behavior consistent while still exposing every required submenu and operational state.
