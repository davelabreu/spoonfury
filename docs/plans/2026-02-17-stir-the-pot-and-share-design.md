# Stir the Pot Nav Tab & Recipe Share Modal Design

**Date**: 2026-02-17
**Status**: Approved

## Goal

Two features:
1. Add a "Stir the Pot" public nav tab linking to the home recipe feed
2. Add a Share button + modal on every recipe page (URL, QR code, WhatsApp)

---

## Feature 1: "Stir the Pot" Nav Tab

### Change to NavBar.tsx

Add a `PUBLIC_TABS` constant at module scope (alongside existing `AUTH_TABS`):

```ts
const PUBLIC_TABS = [
  { label: "Stir the Pot", to: "/" },
];
```

In the desktop tabs column (Column 2), render `PUBLIC_TABS` unconditionally, followed by `AUTH_TABS` when `username` is set. All tabs share the same `layoutId` hover bubble and active underline animations.

Mobile drawer gets the same treatment: "Stir the Pot" appears at top of drawer list always, auth tabs below it when logged in.

### Layout

```
[ 🥄 Spoonfury ]   [ Stir the Pot | My Books | + Recipe ]   [ @user  Sign out ]
                       ↑ always         ↑ auth-only
```

Active underline: `location.pathname === "/"` for "Stir the Pot".

---

## Feature 2: Share Modal on Recipe Page

### New component: `frontend/src/components/ShareModal.tsx`

Same visual pattern as `ForkModal` (backdrop blur, solid white card). Contains:

1. **Copyable URL** — `<input readOnly value={url} />` + "Copy" button. On click: `navigator.clipboard.writeText(url)`, button briefly shows "Copied ✓" for 2 seconds then resets.

2. **QR Code** — `<QRCodeSVG value={url} size={180} />` from `qrcode.react`. Centered below the URL field.

3. **WhatsApp** — `<a href={waUrl} target="_blank" rel="noopener noreferrer">` where `waUrl = \`https://wa.me/?text=${encodeURIComponent(url)}\``. Styled as a green button.

4. **Close** — X button top-right, clicking backdrop closes.

### New dependency

`qrcode.react` — SVG QR code renderer, no canvas required, ~15 KB gzipped.

### Share button placement in RecipePage.tsx

Outside the `{token && ...}` auth gate — sharing works for all visitors, logged in or not. Positioned just after the fork count badge and before the action bar:

```tsx
{/* Share button — always visible */}
<div className="mt-3">
  <Button variant="outline" size="sm" onClick={() => setSharing(true)}>
    Share
  </Button>
</div>

{/* Action bar — logged in only */}
{token && ( ... )}
```

New state: `const [sharing, setSharing] = useState(false);`

---

## Files Changed

| File | Change |
|------|--------|
| `frontend/package.json` | Add `qrcode.react` |
| `frontend/src/components/NavBar.tsx` | Add `PUBLIC_TABS`, render in both desktop and mobile |
| `frontend/src/components/ShareModal.tsx` | New component |
| `frontend/src/pages/RecipePage.tsx` | Add Share button + `sharing` state + `<ShareModal>` |
