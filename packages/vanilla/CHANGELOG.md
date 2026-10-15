# Changelog

All notable changes to `@covergenius/elements` are documented here.

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

