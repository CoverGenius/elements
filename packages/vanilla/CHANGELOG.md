# Changelog

All notable changes to `@covergenius/elements` are documented here.

## [0.3.0] - 2026-11-04

- changed: the `environment` option of `registerElements()` accepts `production`, `uat` and `develop`, matching the Offers API environment names; `production` stays the default
- removed: the `staging` and `sandbox` environment values. This is a breaking change: `registerElements()` now throws `Unknown environment "x". Use one of: production, uat, develop.` for any other value. Replace `staging` with `uat` and `sandbox` with `develop`

## [0.2.9] - 2026-11-04

- fixed: opt-in and opt-out cards, the panel background, the header icon color and size, the credibility text color and the testimonial star color now read their theme variables.
- changed: optInBorderColor/Width/Radius, optOutBorderColor/Radius and credibilityTextColor follow their master (inputBody\*, primaryTextColor) until set, so an existing inputBody\* theme keeps reaching the cards
- changed: option cards carry cge-input-option-opt-in / cge-input-option-opt-out classes so each kind reads its own variables
- fixed: a fan-out child whose shared default is a rem value keeps its parent link in the generated CSS, instead of a flat fallback that would cut inputBodyBorderRadius off from the cards
- removed: testimonialPanelBorderColor (--cge-testimonial-panel-border-color), which had no element to colour; the rated testimonial border is testimonialRatedBorderColor.

## [0.2.8] - 2026-11-03

- changed: updated development dependencies (happy-dom 21.0.4, fast-uri 3.1.9) to clear open security advisories.

## [0.2.7] - 2026-10-26

- added: `opt_in.align` (`start` | `center`, default `start`) sets the text alignment of the CTA option header; an unsupported value falls back to `start` without throwing
- changed: with `opt_in.align: "center"`, a CTA option's price renders below the heading, centered, even when `opt_in.price` has `location: "inline_end"` or none
- removed: `input_body.align` is no longer read, and the `input_body` layout type no longer declares it; the selection control edge is still set by `input_body.selection.location`
- added: the sandbox presentation builder offers a Text align select under the opt-in node, and two CTA text alignment quick tests

## [0.2.6] - 2026-10-26

- added: With `debug: true`, every successful `render()` now logs `render #N on "<key>"` with `{ changed, products }`, so a re-render with an identical offer response is visible (`changed: false`) instead of silent
- changed: Build tooling moves to `vite` 8.3.5 and `vite-node` 6.0.0 (root, vanilla, sandbox); the published bundles keep the same public exports, the CJS build keeps its `"use strict"` directive, and the type declarations gain only `SdkContext.debug`
- changed: The public tree now declares `engines.node` `>=22.12`, the minimum for vite 8, and the root `package.json` declares `>=20.19 || >=22.12`

## [0.2.5] - 2026-10-20

- changed: the hollow CTA style is now the secondary CTA style (class `cge-button-secondary`, variables `--cge-button-secondary-*`)
- removed: the `buttonHollowBackgroundColor` and `buttonHollowHoverBackgroundColor` theme overrides; use `buttonSecondaryBackgroundColor` and `buttonSecondaryHoverBackgroundColor`
- added: header badges with `inline_start` or `inline_end` move above the heading when the container is 480px wide or less
- changed: the copyright holder in NOTICE is Cover Genius Assets PTY LTD
- changed: updated development dependencies
- fixed: Bypass changelog when testing for hollow ref

## [0.2.4] - 2026-10-15

- changed: the README now says the package is in alpha and not on npm yet, and the install command is removed
- fixed: the README status no longer says layout rendering, theming and interaction logic are not implemented

## [0.2.3] - 2026-10-15

- changed: the package license is now Apache-2.0
- added: LICENSE and NOTICE files in the published package

## [0.2.2] - 2026-10-14

- fixed: checkboxes now show the required error border, like radio buttons
- changed: checkboxes are drawn by the SDK (20px, 3px radius) instead of the browser default
- changed: selection.required() is ignored while an option is selected
- removed: the tagName option from registerElements(); the element is always
- removed: the nonce option from registerElements(); it never had any effect

