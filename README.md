# APIVault

[![Repository checks](https://github.com/yyyuvvvraj/APIVault/actions/workflows/repository-checks.yml/badge.svg?branch=dev)](https://github.com/yyyuvvvraj/APIVault/actions/workflows/repository-checks.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg)](CONTRIBUTING.md)

**APIVault is a community-driven directory of useful APIs for developers.**

Discover APIs, compare their capabilities and requirements, and contribute reliable, well-documented API listings. APIVault is being built as a web application backed by a curated API catalogue, with a public REST API planned as the catalogue and community mature.

## What we're building

- A searchable web directory of useful APIs.
- Consistent API profiles covering documentation, authentication, pricing, limits, terms, and provider details.
- Community contributions with source links, verification dates, and maintainer review.
- A public REST API as a later platform capability, built from the same catalogue data.

## Project principles

- Accuracy and provenance over raw catalogue size.
- Clear distinction between free, freemium, paid, and unknown pricing.
- Transparent authentication, rate-limit, geography, and usage restrictions.
- Safe, reviewable community contributions.
- No claim of affiliation with listed API providers unless explicitly authorized.

## Project status

APIVault is in its foundation and product-design phase. The repository's governance, contribution process, and automated checks are in place. Application implementation and the catalogue data contract are the next milestones.

See [docs/PRODUCT_DIRECTION.md](docs/PRODUCT_DIRECTION.md) for the initial product scope and staged roadmap.

## Contributing

Contributions of code, API listings, data corrections, tests, and documentation are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Look for issues labelled **good first issue**.

## Development workflow

- `dev` is the default integration branch.
- Work on short-lived branches such as `feature/add-api-catalogue` or `docs/improve-readme`.
- Open pull requests into `dev`; do not push directly to protected branches.
- Stable releases will be prepared from `dev` and published from `stable` with version tags.

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for the complete workflow.

## Community

- [Report a bug](https://github.com/yyyuvvvraj/APIVault/issues/new?template=bug_report.yml)
- [Request a feature](https://github.com/yyyuvvvraj/APIVault/issues/new?template=feature_request.yml)
- [Start a discussion](https://github.com/yyyuvvvraj/APIVault/discussions)
- [Security policy](SECURITY.md)

## License

APIVault is licensed under the [MIT License](LICENSE).
