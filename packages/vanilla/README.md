# @covergenius/elements

The CG Elements core engine. Registers the `<cg-elements>` custom element, renders offer presentation profiles, and owns interaction/events. Vanilla TypeScript: no React, Vue, or DOM-framework dependency, so it runs anywhere a `<script type="module">` and custom elements are supported: partner webapps, and mobile WebViews / installed PWAs.

## Install

Not available yet. The package is not on npm. This section will show the install command when the first version is published.

## Usage

```js
import { registerElements, getElement } from '@covergenius/elements';

// 1. Register the custom element once per page.
registerElements({ environment: 'production' });

// 2. Get the instance client, wire events, render.
const cgElement = getElement();
cgElement.on('change', ({ selectedOption, selectedProductIDs }) => {
  /* … */
});
cgElement.on('submit', ({ selectedOption, selectedProductIDs }) => {
  // proceed to booking
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

| Field            | Optional | Purpose                                                                       |
| ---------------- | -------- | ----------------------------------------------------------------------------- |
| `environment`    | no       | Selects telemetry endpoints / asset base. No offer network calls happen here. |
| `currencyConfig` | yes      | Currency formatting config applied by the engine.                             |
| `debug`          | yes      | Enables SDK logging.                                                          |

**Instance client** (returned by `getElement`, or `undefined` before `registerElements` has run)

Inbound (partner → SDK):

| Method                    | Effect                                                                                                                                                   |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `render(response)`        | Render / re-render from the offer response's `presentation` profile.                                                                                     |
| `selection.set(optionId)` | Choose an option programmatically.                                                                                                                       |
| `selection.reset()`       | Clear the selection (also clears the required prompt).                                                                                                   |
| `selection.get()`         | Read the last selected option id, or `null`.                                                                                                             |
| `selection.getAll()`      | Read every selected option id, in selection order (`[]` if none).                                                                                        |
| `selection.required()`    | Show the "must select something" prompt while nothing is selected; ignored when an option is already selected. Cleared by `reset()` or a user selection. |

The panel's lifecycle state (loading, rendered, hidden) is SDK-owned, driven by
`render()` and internal outcomes, not set by the partner. `loading` is the
initial skeleton state, shown until the first `render()`.

Outbound (SDK → partner):

| Event     | Payload                                                                                                                                                                                                                                             |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ready`   | Instance rendered.                                                                                                                                                                                                                                  |
| `change`  | `{ selectedOption, selectedProductIDs }`. When the offer allows more than one option at once, `selectedOption` is the option just toggled and `selectedProductIDs` is every currently selected quote id (empty when the last option is deselected). |
| `submit`  | The partner's book action (payload shape provisional).                                                                                                                                                                                              |
| `error`   | SDK-internal render failure (malformed presentation, unknown layout/variant); the panel is hidden.                                                                                                                                                  |
| `invalid` | The current selection is invalid (payload shape provisional).                                                                                                                                                                                       |

Full wire contract and design rationale: pending addition to `docs/` at the
repo root.

**Server-side rendering.** `@covergenius/elements` renders in the browser only, but it is safe to import on the server (Next.js, Nuxt, plain Node, ESM or CJS): importing never throws, `registerElements()` is a no-op without a DOM, and `getElement()`
returns `undefined`. Call `registerElements()` and `getElement()` from client-only code, and optional-chain the result (`getElement()?.render(...)`).

**TypeScript.** ESM and CommonJS consumers both get full types, including under `module` / `moduleResolution` `node16` and `nodenext` (`.d.ts` for `import`, `.d.cts` for `require`).

## Development

From the repo root (this is a pnpm workspace):

```bash
pnpm install
pnpm --filter @covergenius/elements test
pnpm --filter @covergenius/elements build
```

## Status

Alpha. The API can change between versions. The package is not on npm yet.
