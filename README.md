# CG Elements

CG Elements is a framework-agnostic SDK from Cover Genius. It renders insurance offers on partner pages as a `<cg-elements>` custom element. It works in any web app that supports `<script type="module">` and custom elements, and in mobile WebViews.

> **Alpha.** This SDK is in alpha and the API can change between versions. It is not on npm. Each version is published as a release on GitHub.

## Install

During alpha you install a release tarball from GitHub. Each release is tagged `vanilla-vX.Y.Z` and holds the tarball `covergenius-elements-X.Y.Z.tgz` and a `SHA256SUMS` file.

1. Pick a version on the [releases page](https://github.com/CoverGenius/elements/releases).
2. Install it with the release URL. Replace `X.Y.Z` in both the tag and the file name.

```bash
# npm
npm install https://github.com/CoverGenius/elements/releases/download/vanilla-vX.Y.Z/covergenius-elements-X.Y.Z.tgz

# pnpm
pnpm add https://github.com/CoverGenius/elements/releases/download/vanilla-vX.Y.Z/covergenius-elements-X.Y.Z.tgz

# yarn
yarn add https://github.com/CoverGenius/elements/releases/download/vanilla-vX.Y.Z/covergenius-elements-X.Y.Z.tgz
```

The release URL pins the exact version. Do not change it to a range during alpha.

To verify the download before you install, fetch both files and check the hash:

```bash
curl -fsSLO https://github.com/CoverGenius/elements/releases/download/vanilla-vX.Y.Z/covergenius-elements-X.Y.Z.tgz
curl -fsSLO https://github.com/CoverGenius/elements/releases/download/vanilla-vX.Y.Z/SHA256SUMS
shasum -a 256 -c SHA256SUMS
```

If the check does not print `OK`, do not install the file. Contact your Cover Genius representative.

Full steps, including monorepo workspaces, are in the [installation guide](https://partner-docs.covergenius.com/elements/installation).

## Packages

| Package | Description |
| --- | --- |
| [`@covergenius/elements`](packages/vanilla) | The core engine. Registers `<cg-elements>`, renders offers, and emits `ready`, `change` and `error` events. |

Usage and the API are in the [package README](packages/vanilla/README.md).

## Security

Report a vulnerability through the private reporting form. See [SECURITY.md](SECURITY.md). Do not open a public issue for a security problem.

## Status

This repository is a read-only copy of released versions. It does not accept pull requests or issues.

## License

Apache License 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE). The Cover Genius and XCover marks are not licensed for use in forks.
