# UX Patterns

Practical guidance for building consistent, performant, and accessible UI across the app.

## Foundations
- **Typography:** Use the configured sans stack; avoid introducing new fonts without review. Keep headings Title Case; body sentence case.
- **Color & State:** Stick to the Tailwind design tokens already used (emerald/cyan/blue for primary actions; amber for warnings; red for destructive). Provide hover, focus, active, disabled states.
- **Spacing:** Default container padding 16–24px; maintain 8px grid for gaps.
- **Elevation:** Cards use light shadow and rounded corners; avoid multiple nested shadows.
- **Responsiveness:** Build mobile-first; ensure grids collapse to single column under 768px; avoid horizontal scroll unless tables require it.
- **Accessibility:** Label every input; keep a clear focus ring; ensure text contrast AA or better; prefer buttons over clickable divs.

## Layout Blocks
- **Page Hero:** Gradient header with title, subtitle, optional stats/buttons. Avoid cramming actions; primary action on the right.
- **Cards:** Border, light shadow, rounded corners. Header (title, optional badge), body with 16px padding. Keep actions aligned right in footers.
- **Forms:** Group related fields in logical sections (assignment, trip details, approvals). Use helper text sparingly. Show inline error text in red-600 below the field.
- **Tables/Lists:** Sticky headers when the table is tall; zebra rows are optional. Provide mobile cards for narrow viewports.
- **Modals:** Centered, max-width 640–768px. Include a close button. Prevent scroll bleed with overlay.

## Interaction Patterns
- **Buttons:** Primary = solid colored, secondary = outline/ghost, destructive = red. Disable while submitting; show loading spinner when async.
- **Validation:** Validate on change; block submit when invalid. Keep error messages concise (“Required”, “Enter a valid number”).
- **Feedback:** Success/error toasts or inline banners; avoid silent failures. For long tasks, show a progress indicator.
- **Confirmation:** Ask confirmation for destructive actions (delete, cancel, void). For minor edits, do not prompt.
- **Empty States:** Provide a short description plus a single clear call-to-action (e.g., “Add Vehicle”).

## Form Inputs
- Always provide `label`, `placeholder`, `required`, and `error` props where relevant.
- Use `autoComplete` thoughtfully: names/addresses with semantic hints; numbers/dates with `on`.
- For selects with search, pair a free-text filter with a dropdown list. Keep list height ≤ 240px and keyboard accessible.
- Preserve uppercase transformations where the domain expects uppercase identifiers.

## Motion & Visual Polish
- Keep animations minimal (<200ms). Use fades/slides for modals and dropdowns; avoid bounce.
- Use gradients sparingly for hero/headers; prefer solid backgrounds elsewhere.
- Maintain consistent icon sizes (16–24px) aligned with text baseline.

## Content Tone
- Concise, instructional, government-friendly. Avoid jargon; prefer verbs (“Submit Request”, “Validate Receipt”).
- Date format: `MMM D, YYYY` for display; ISO `YYYY-MM-DD` for inputs.

## Review Checklist
- Labels + placeholders + errors present.
- Keyboard/focus works for all interactive elements.
- Mobile layout stays readable; no clipped content.
- Loading/empty/error states rendered.
- Destructive actions confirmed.
