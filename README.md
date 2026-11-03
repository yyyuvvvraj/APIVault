# APIVault

[![Repository checks](https://github.com/yyyuvvvraj/APIVault/actions/workflows/repository-checks.yml/badge.svg?branch=dev)](https://github.com/yyyuvvvraj/APIVault/actions/workflows/repository-checks.yml)
[![Application CI](https://github.com/yyyuvvvraj/APIVault/actions/workflows/application-ci.yml/badge.svg?branch=dev)](https://github.com/yyyuvvvraj/APIVault/actions/workflows/application-ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**APIVault is a community-driven directory of useful APIs for developers.**

Discover APIs, compare their capabilities and requirements, and contribute reliable, well-documented API listings. APIVault is a web application backed by a curated API catalogue, with a public REST API built from the same canonical records as the catalogue matures.

## Technology

- Next.js 16, React 19, TypeScript, and Tailwind CSS 4.
- PostgreSQL 18 with Prisma ORM 7.
- Zod for runtime validation.
- GitHub Actions for repository and application checks.

## Local development

New contributors should follow the step-by-step [setup guide](docs/SETUP.md). For a concise local development reference, see [local development](docs/LOCAL_DEVELOPMENT.md). Read the [architecture](docs/ARCHITECTURE.md), [canonical data model](docs/DATA_MODEL.md), and [verification policy](docs/VERIFICATION_POLICY.md) before changing catalogue behaviour. For container builds and GHCR publishing, see the [Docker deployment guide](docs/DOCKER_DEPLOYMENT.md).

## Public API

The public API is read-only and currently exposes catalogue listings, individual API records, and categories. See the [API usage policy](docs/API_USAGE_POLICY.md) for current rate limits, caching and conditional request guidance, attribution, and fair-use expectations. The [OpenAPI specification](docs/openapi.json) documents the available endpoints.

## Contributing

Contributions of code, API listings, data corrections, tests, and documentation are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md). API suggestions should include official source links and can be submitted using the [Suggest an API issue form](https://github.com/yyyuvvvraj/APIVault/issues/new?template=api_submission.yml).

## Development workflow

- The dev branch is the default integration branch.
- Work on short-lived branches such as feature/add-api-catalogue or docs/improve-readme.
- Open pull requests into dev; do not push directly to protected branches.
- Stable releases will be prepared from dev and published from stable with version tags. Review the [release-readiness checklist](docs/RELEASE_READINESS.md) before creating a release candidate.

## Community

- [GitHub Discussions](https://github.com/yyyuvvvraj/APIVault/discussions)
- [Report a bug](https://github.com/yyyuvvvraj/APIVault/issues/new?template=bug_report.yml)
- [Request a feature](https://github.com/yyyuvvvraj/APIVault/issues/new?template=feature_request.yml)
- [Security policy](SECURITY.md)

## License

APIVault is licensed under the [MIT License](LICENSE).
