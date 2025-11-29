# Code Patterns

Common patterns to stay consistent across React + Firebase + TypeScript.

## State & Data
- **Stores:** Keep global auth/user state in `zustand`; prefer component state for local UI only.
- **Firestore reads:** Use `collection + query + where/orderBy/limit`; always wrap dates with `.toDate?.()` when hydrating into JS objects.
- **Firestore writes:** Centralize payload mapping near submit handlers; use `serverTimestamp()` for audit fields; guard against stale writes by comparing `updatedAt`.

## Forms
- **Validation:** Use `react-hook-form` + `zodResolver`. Keep schemas near the component. Convert numbers with `parseFloat`; keep strings for inputs.
- **Default values:** Provide `defaultValues` and use `reset` for edits. When passing values to custom inputs, ensure they support both controlled/uncontrolled (our `Input` and `Textarea` do).
- **Error handling:** Display `errors.field?.message` below the input. Disable submit while `isSubmitting`.

## Components
- **UI primitives:** Use `Button`, `Input`, `Textarea`, `Select`, `Card`, `Badge`, `Modal` from `@/components/ui`. Avoid raw HTML unless necessary.
- **Lists/Tables:** Accept `isLoading` and show skeleton/placeholder; render empty state with CTA.
- **Modals:** Controlled via `isOpen` prop; close handlers must clean up transient state.

## Async Patterns
- Wrap async handlers in `try/catch/finally`; surface failures via banner or toast.
- When concurrent edits matter, re-read the doc, compare `updatedAt`, and block with a notice if stale.
- For sequential Firestore writes (e.g., creating counter then doc), await each call; avoid race conditions with transactions where needed.

## Formatting Utilities
- **Dates:** Use helper `formatDateForInput` for inputs; `toLocaleDateString` for display. Store Firestore timestamps as `Timestamp`.
- **Currency:** Sanitize input, format with commas, store numeric value; avoid keeping commas in Firestore.
- **Uppercasing:** Only uppercase where domain expects (plates, names in official docs).

## Example: Safe Firestore Update
```ts
const ref = doc(db, 'fuel_requisitions', id);
const snap = await getDoc(ref);
const currentUpdatedAt = snap.data()?.updatedAt?.toMillis?.();
if (loadedUpdatedAt && currentUpdatedAt && currentUpdatedAt !== loadedUpdatedAt) {
  throw new Error('Stale data');
}
await updateDoc(ref, { ...payload, updatedAt: serverTimestamp() });
```

## Example: React Hook Form + custom Input
```tsx
<Input
  label="Requested Liters"
  type="number"
  error={errors.requestedLiters?.message}
  {...register('requestedLiters')}
/>
```

## Code Review Checklist
- Schema + UI validation match backend expectations.
- Controlled/uncontrolled inputs behave with `reset`/`setValue`.
- Firestore writes have timestamps and null-safe fields.
- Loading/error/empty states covered.
