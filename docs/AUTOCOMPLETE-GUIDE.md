# Autocomplete Guide

How we implement and maintain autocomplete experiences.

## Principles
- Keep interactions light: filter client-side, debounce only if hitting network.
- Bound dropdown height (≤ 240px), allow scroll, and close on blur with a short timeout.
- Provide semantic `autoComplete` attributes where possible (e.g., `name`, `street-address`, `on` for dates/numbers).
- Persist only non-sensitive values (names, destinations, brands) in `localStorage`; never store IDs/tokens.

## Patterns

### Input + Suggestions (local)
```tsx
const [show, setShow] = useState(false);
const [suggestions, setSuggestions] = useState<string[]>([]);
const value = watch('field');

<Input
  label="Destination"
  autoComplete="on"
  {...register('destination')}
  onFocus={() => setShow(true)}
  onBlur={() => setTimeout(() => setShow(false), 120)}
/>;

{show && suggestions.length > 0 && (
  <div className="absolute z-20 mt-1 w-full rounded-lg border bg-white shadow-lg max-h-56 overflow-auto">
    {suggestions
      .filter((s) => !value || s.toLowerCase().includes(value.toLowerCase()))
      .slice(0, 8)
      .map((s) => (
        <button
          key={s}
          type="button"
          className="w-full text-left px-3 py-2 hover:bg-primary-50"
          onMouseDown={(e) => {
            e.preventDefault();
            setValue('destination', s, { shouldValidate: true });
            setShow(false);
          }}
        >
          {s}
        </button>
      ))}
  </div>
)}
```

### Persisting Suggestions
```ts
const STORAGE_KEY = 'destination_suggestions';
const load = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
const save = (values: string[]) =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify(values.slice(0, 12)));

const addSuggestion = (val: string) => {
  const clean = val.trim();
  if (clean.length < 2) return;
  const next = [clean, ...load().filter((v: string) => v !== clean)].slice(0, 12);
  save(next);
  setSuggestions(next);
};
```

### Accessibility
- Keep the list below the input; ensure tab/shift+tab leave cleanly.
- Use button elements for options for focusability.
- Preserve focus ring; avoid removing outlines.

## Do / Don’t
- **Do:** Close dropdown on selection; debounce heavy filters; uppercase only where domain expects.
- **Don’t:** Auto-submit on selection; store PII beyond what’s needed; leave dropdowns open on blur.

## Testing
- Verify `autoComplete` hints appear in browser.
- Ensure dropdown filters by typed text and caps-insensitive.
- Confirm selection writes back to the form state and validation passes.
