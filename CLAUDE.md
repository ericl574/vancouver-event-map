# VanEvent Project Rules

## Roles

- Eric / Lynne is the client and product owner.
- ChatGPT acts as the product manager / product director.
- Claude Code acts as the main coder in terminal.

ChatGPT must not behave like a passive prompt writer. Even when Claude Code performs implementation work, ChatGPT remains responsible for independently checking the work before telling the client it is done.

## PM Responsibility

When reviewing or directing work, ChatGPT must personally verify:

- product requirements and acceptance criteria
- code changes and likely regressions
- visual UI quality against supplied references
- mobile and desktop UX
- map behavior, marker behavior, search behavior, filters, event cards, and distance ranking
- build/test status
- browser console errors when relevant

It is good to ask Claude Code to do QA, but that is not enough. ChatGPT must also inspect and validate the result directly whenever possible.

## Client Communication

- Treat Eric / Lynne as the client.
- Ask the client for anything needed to make a correct decision, including screenshots, terminal output, browser console errors, Supabase status, or product preference.
- Do not hesitate to ask clarifying questions when the answer cannot be safely inferred.
- Explain tradeoffs in simple product language.

## Standing Rule Updates

Whenever the client gives a new project rule, workflow rule, product constraint, or recurring instruction, update this `CLAUDE.md` file so future sessions inherit it.

## Current Product Direction

VanEvent is a mobile-first event discovery app for Vancouver / Greater Vancouver. The core experience is map-first: users should immediately see a real interactive map with event markers, then search, filter, click markers, view event details, save/share events, add events to calendar, and discover what is happening near them.

The app should remain event-focused, not a generic city guide.

## Current UI Direction

The file `ui_design.png` is the visual reference. The client wants the implemented UI/UX to match this reference as closely as possible, not merely improve in the same general direction. Treat the reference as the target for visual comparison, especially:

- polished map feeling
- event markers
- selected marker treatment
- grouped count markers
- left event panel and cards
- top navigation and category styling

Do not replace the real interactive map with a static image.

When reviewing design progress, compare the current screen directly against `ui_design.png` and call out visible gaps. If the map provider or current stack prevents an exact match, explain the limitation clearly and propose the closest practical implementation path.

Before any UI implementation pass, open and inspect `ui_design.png`. Follow its layout, spacing, visual hierarchy, marker style, map control style, card structure, colors, shadows, typography scale, and interaction placement as closely as possible. Do not introduce a different visual direction unless the client explicitly asks for it. If an implementation choice differs from `ui_design.png`, it must be because of a real technical/product constraint, and that constraint should be reported.

Specific reference details the client expects:

- Map controls should match the reference: a locate button, separate stacked zoom `+` / `-` controls, and a `3D` toggle button.
- Map controls should sit together near the top-right of the map, matching `ui_design.png`; do not place zoom or `3D` controls low on the right side unless the client explicitly asks.
- Map controls should have enough vertical breathing room between locate, zoom `+`/`-`, and `3D` buttons. Do not stack them so tightly that they feel cramped or visually merged.
- Locate must be functional, not decorative. Clicking it should request/use browser geolocation, set the user location, move/focus the map, and show clear user-facing feedback if permission is denied, unavailable, or fails.
- Search/list area should include quick-filter chips beneath the search input and within the left panel flow, below or cleanly associated with the `Events in Greater Vancouver` section. They must never overlap the list title, event count, or each other.
- Quick-filter chips such as `Tonight`, `This Weekend`, `Free`, and `Near Me` must be toggleable/deselectable when their behavior is stateful.
- Do not duplicate `Nearest` / `Near Me` as both a floating map button and a list/search quick chip. Prefer the quick chip in the list/search area and remove the duplicate floating Nearest button near the map controls unless explicitly requested.
- The desktop event list panel should be wide enough for image-led cards to be useful. If event thumbnails or featured images are cramped, widen the list panel rather than shrinking images until they lose value.
- In the event list cards, use available panel space to make thumbnails visibly wider when there is room. Event images should be useful visual signals, not tiny slivers.
- Preserve original/comfortable event card sizing when the client says the size should remain as before. Do not enlarge thumbnails or panels beyond the intended design balance without explicit approval.
- The event list panel and search bar should match the current time filter panel width/size when the client asks for consistent sizing. Use the filter panel as the sizing reference for desktop left-side surfaces.
- When the client says event images can be larger without changing list size, keep the panel/search/filter widths unchanged and reallocate space inside event cards by widening thumbnails and moving/compressing text/actions as needed.
- When the client asks to make the list wider without changing image size, increase the event list/search/filter width consistently but keep event thumbnail dimensions unchanged. Allocate the added width to text/action breathing room.
- The event list typography may be increased by one step when the client asks, but verify text still fits cleanly and cards remain scannable.
- If the client asks to decrease the details part in a preview/list card, reduce only the metadata/detail lines such as venue, area, date, time, and price by one text size. Do not shrink the title unless explicitly requested.
- Date/time/price metadata should be visible in both compact/unselected event list cards and selected/featured event list cards. If the card feels too tall, reduce metadata font size and line-height by one or two steps instead of removing the metadata.
- The left event list should follow the `ui_design.png` event-list structure closely when requested: search at top, icon+text quick chips, status row, one featured selected card with square image and labeled action buttons, compact cards with square thumbnails and bookmark affordance, and a bottom `View more events` control.
- Event-list thumbnails should use a square image format with rounded corners, matching the reference card style. Do not leave hard square/sharp image corners when the client asks for rounded corners.
- Compact/unselected event-list cards should align the visible event text/instruction block to a truly square thumbnail, like the reference. Do not stretch the thumbnail height to match text, because that creates a tall rectangle. Keep explicit equal width/height for the image container, then adjust typography, line-height, metadata density, wrapping, and card padding so the text block visually fits beside that square.
- Do not leave blank/empty space below event-card images while trying to align thumbnails and text. Fix alignment by adjusting font size, line-height, wrapping, padding, and adaptive sizing only; do not redesign unrelated card structure.
- Event-list action buttons should be understandable, not mystery icons, when the reference shows labels. On selected/featured event list cards, keep the save/bookmark affordance as an icon near the card header/top-right rather than a duplicate labeled `Save` button in the bottom action row. The bottom action row should prioritize `Share`, `Add to calendar`, and a pink `Tickets` button with an external-link icon. Compact cards may use a simpler bookmark affordance.
- Event-list action labels and quick-filter labels should stay on one line. If labels such as `Add to calendar`, `This Weekend`, `Free`, or `Near Me` wrap, adjust panel width, button spacing, or font size so they remain single-line.
- Button text inside the event list should stay compact; reduce action/chip button font size when labels feel cramped.
- Every visible feature or control must be enabled and tested. If a button, chip, map control, save/share/calendar action, ticket action, or detail action is visible, it must either work or be clearly disabled with a reason.
- Top navigation buttons must work and be tested: category tabs, Saved, account/login, and any visible account/menu controls. Do not leave visible top-nav buttons as dead UI.
- Category explore panels/popovers opened from top category navigation must not overlap or cover the search bar, quick chips, or event list panel. Use a smaller adaptive width, responsive positioning, and a gradual/soft frame treatment so the panel fits beside the left-side system on desktop and becomes an appropriate overlay/sheet on smaller screens.
- Event list featured/selected card should match the client-approved reference when provided: square rounded image on the left, featured badge over image, text on the right, date/time/price metadata visible, bookmark/save affordance, pink frame, and the approved action row when requested. Do not remove venue, date, time, or price metadata from selected cards unless the client explicitly asks.
- The right-side event preview/detail card should show event details directly when an event is selected. Do not require a `View Details` button just to reveal the core details.
- The right-side event preview/detail card must not overlap the top-right map controls, especially the `3D` button. If needed, lower the detail card or reserve top/right spacing so locate, zoom, and `3D` remain visible and clickable.
- Use compact category icons in the preview/detail card when they can reduce vertical length without losing clarity. Prefer icon + concise label/metadata over long repeated text blocks.
- Do not change the event detail page/card design while fixing event-list card issues unless the client explicitly asks. If detail page changes were made accidentally, revert them.
- In the Saved events page/list, do not show duplicate mini action buttons on the saved card preview when the right-side detail pane already contains those actions. Keep saved-list previews clean and use the right-side detail area for actions.
- Selected/saved event cards may keep the original subtle effect, but the pink selection frame/border must be fully visible on all sides and not clipped by parent overflow, image cropping, or container padding.
- Full event detail pages/cards should place primary actions such as Share, Add to Calendar, and Tickets at the bottom of the detail content when the client requests that layout.
- Bottom detail actions must appear in the actual detail view the client is using, not only in a separate variant/page. Verify visually that Share, Add Calendar, and Tickets are visible at the bottom of the selected event detail experience.
- In the event detail bottom action row, the Tickets button should be styled as a prominent pink call-to-action.
- Do not show internal/explanatory copy such as `Inferred from the event title, description, venue, and tags.` in the user-facing UI.
- If the client asks to enlarge event-list image previews, increase only the thumbnail area inside the existing list width and move text slightly right; do not widen the event list panel unless explicitly requested.
- The search status row should resemble the reference summary: active time/location context plus event count, free count, and nearby count when available.
- Single event markers should be true pin/bubble markers with a pointed tail, white outer body/ring, category-colored center, icon inside, and shadow. Plain circles are not close enough.
- Map event marker/icon colors and related UI accents should use a soft macaron theme, but blue and pink must be visually obvious and high enough contrast to read on the map. Required category colors: Music should stay in the `#B7E0FF` family but may be strengthened with a deeper blue outline/icon/accent; Food & Drink `#FFDCA4`; grouped count/big number bubbles should stay in the `#FEDEE1` family but use a stronger pink text/ring/accent so they are clearly visible. Choose complementary macaron colors for other categories while preserving contrast. Use these colors mainly for marker centers/icons while keeping a white marker body/ring and subtle shadow for contrast. Preserve marker behavior while mapping event categories into this palette.
- Selected marker should have a large blue premium marker treatment with a visible glowing/ripple base.
- Grouped count markers should use the approved soft pink `#FEDEE1` bubble style with readable text, strong white ring, and soft shadow.
- Do not keep `Free` as a duplicate top-level category when it is already represented by the quick-filter chips; avoid duplicating the same concept in both the top category navigation and the quick filter row.
- Do not duplicate saved/favorite navigation. Use the top-level `Saved` button as the single entry point for saved events, and remove `Favorite List` / duplicate saved-event links from the account menu unless the client asks for both.

## Current Technical Guardrails

- Preserve existing event content and data unless explicitly instructed.
- Do not add fake/demo events.
- Do not change Supabase schema unless explicitly instructed.
- Do not change import scripts unless the task is about data/import logic.
- Do not break Mapbox address autocomplete.
- Do not break address-based distance ranking.
- Preserve marker click, grouped marker click, event card click, empty-map deselect, panel collapse, search, filter, and nearest behavior.
- When the user opens a venue/location group with multiple events and clicks one event inside that venue list, the right-side preview/detail card should stay open for that selected event and the left panel should preserve the venue/location group context. Do not automatically jump back to the all-events page/list unless the user clicks `Show all` or otherwise explicitly requests it.
- Visual redesigns must not turn working controls into decorative/dead buttons. Preserve or reconnect existing behavior for Locate, Save, Share, Add to Calendar, Tickets/View Details, filters, and map controls.
- If a UI control cannot be wired safely yet, do not present it as active. Disable it with clear affordance or report the missing behavior before delivery.
- Save/favorite state must stay synchronized across all places where the same event appears. Saving/unsaving in a list card should immediately update the corresponding detail card, saved count, and any other visible save buttons for that event.
- Before editing, inspect current repo state because teammates may have changed code.

## QA Expectations

For meaningful frontend changes:

- run `npm run build`
- run the dev server
- inspect desktop layout
- inspect mobile layouts around `375x812` and `390x844`
- test marker clicks, grouped marker clicks, event card clicks, empty-map deselect, category filters, search, address suggestion selection, distance ranking, and Nearest
- check browser console errors when possible

For map/marker changes, verify visually in browser. Code-level reasoning alone is not enough.
