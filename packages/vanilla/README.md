# @covergenius/elements

The CG Elements core engine. Registers the `<cg-elements>` custom element, renders offer presentation profiles, and owns interaction/events. Vanilla TypeScript: no React, Vue, or DOM-framework dependency, so it runs anywhere a `<script type="module">` and custom elements are supported: partner webapps, and mobile WebViews / installed PWAs.

## Install

Not on npm yet. During alpha, each version is a release on GitHub. Pick a version on the [releases page](https://github.com/CoverGenius/elements/releases) and install its tarball (replace `X.Y.Z` in the tag and the file name):

```bash
npm install https://github.com/CoverGenius/elements/releases/download/vanilla-vX.Y.Z/covergenius-elements-X.Y.Z.tgz
# or: pnpm add <url>   /   yarn add <url>
```

The release URL pins the exact version. Checksum verification and monorepo steps are in the [installation guide](https://partner-docs.covergenius.com/elements/installation).

## Usage

```js
import { registerElements, getElement } from '@covergenius/elements';
// CommonJS: const { registerElements, getElement } = require('@covergenius/elements');

// 1. Register the custom element once per page.
registerElements({ environment: 'production' });

// 2. Get the instance client, wire events, render.
const cgElement = getElement();
cgElement.on('change', ({ selectedOption, selectedProductIDs, declined }) => {
  // The selection changed. `declined` is true when the customer declined the offer.
});
cgElement.on('error', ({ code, message }) => {
  // The panel could not render and is hidden.
});
cgElement.render(offerResponse);
```

```html
<cg-elements></cg-elements>
```

For more than one placement on a page, tag each element with
`data-presentation-ref` (read from `response.presentation.ref`) and address it
explicitly:

```html
<cg-elements data-presentation-ref="checkout-primary"></cg-elements>
```

```js
const cgElement = getElement('checkout-primary');
cgElement.render(offerResponse);
```

## API

| Export                      | Signature                                   | Notes                                                                                                                  |
| --------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `registerElements(config?)` | `(config?: RegisterElementsConfig) => void` | Page-level, idempotent. Call once, before `getElement()`.                                                              |
| `getElement(ref?)`          | `(ref?: string) => Client \| undefined`     | Returns the instance client, or `undefined` if the SDK has not been registered yet. Omit `ref` for a single placement. |

**`RegisterElementsConfig`**

| Field            | Optional | Purpose                                                                                                                                      |
| ---------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `environment`    | no       | `'production'`, `'staging'` or `'sandbox'`. Defaults to `'production'`. All three behave the same today. No offer network calls happen here. |
| `currencyConfig` | yes      | Currency formatting config applied by the engine.                                                                                            |
| `debug`          | yes      | Enables SDK logging.                                                                                                                         |
| `scheme`         | yes      | `'light'` or `'dark'`. Defaults to `'light'`.                                                                                                |

**Instance client** (returned by `getElement`, or `undefined` before `registerElements` has run)

Inbound (partner → SDK):

| Method                    | Effect                                                                                                                                                                                                                                  |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `render(response)`        | Render / re-render from the offer response's `presentation` profile.                                                                                                                                                                    |
| `selection.set(optionId)` | Choose an option programmatically.                                                                                                                                                                                                      |
| `selection.reset()`       | Clear the selection (also clears the required prompt).                                                                                                                                                                                  |
| `selection.get()`         | Read the last selected option id, or `null`.                                                                                                                                                                                            |
| `selection.getAll()`      | Read every selected option id, in selection order (`[]` if none).                                                                                                                                                                       |
| `selection.required()`    | Show the "must select something" prompt while nothing is selected; ignored when an option is already selected. Cleared by `reset()` or a user selection.                                                                                |
| `unmount()`               | Release the placement. After it, `render()` on this client is a no-op; call `getElement()` again for a fresh client.                                                                                                                    |
| `on(event, callback)`     | Bind a handler for `ready`, `change` or `error`. One handler per event: a later `on()` for the same event replaces the earlier one, so re-binding on every framework render does not stack handlers. Handlers survive every `render()`. |

The panel's lifecycle state (loading, rendered, hidden) is SDK-owned, driven by
`render()` and internal outcomes, not set by the partner. `loading` is the
initial skeleton state, shown until the first `render()`.

Outbound (SDK → partner):

| Event    | Payload                                                                                                                                                                                                                                                                                                                                                       |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ready`  | No payload. The instance rendered.                                                                                                                                                                                                                                                                                                                            |
| `change` | `{ selectedOption, selectedProductIDs, declined? }`. When the offer allows more than one option at once, `selectedOption` is the option just toggled and `selectedProductIDs` is every currently selected quote id (empty when the last option is deselected). `declined` is `true` when the customer declined the offer; `selectedProductIDs` is then empty. |
| `error`  | `{ code, message }`. The presentation could not render and the panel is hidden. `code` is one of `presentation_empty`, `presentation_malformed`, `schema_version_unsupported` or `not_registered`.                                                                                                                                                            |

There is no `submit` or `invalid` event.

**Server-side rendering.** `@covergenius/elements` renders in the browser only, but it is safe to import on the server (Next.js, Nuxt, plain Node, ESM or CJS): importing never throws, `registerElements()` is a no-op without a DOM, and `getElement()`
returns `undefined`. Call `registerElements()` and `getElement()` from client-only code, and optional-chain the result (`getElement()?.render(...)`).

**TypeScript.** ESM and CommonJS consumers both get full types, including under `module` / `moduleResolution` `node16` and `nodenext` (`.d.ts` for `import`, `.d.cts` for `require`). The package exports the types `RegisterElementsConfig`, `OfferResponse`, `PresentationProfile`, `ChangeEventDetail`, `ErrorEventDetail`, `SelectionApi`, `PresentationErrorCode` and `Client`.

**Styles.** Panel styles are injected into the shadow root, so you import no stylesheet. Optionally import the loader stylesheet to show a loading animation before the element registers:

```js
import '@covergenius/elements/loader.css';
```

## Status

Alpha. The API can change between versions. The package is not on npm. Each version is a release on GitHub.
