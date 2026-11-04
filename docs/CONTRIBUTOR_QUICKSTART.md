# First contribution to APIVault

Welcome! APIVault is built around three pillars: API discovery, evidence-based verification, and community-maintained catalogue quality.

## A good first contribution

- Improve a broken or unclear documentation example.
- Add a unit test for a validation or search edge case.
- Improve keyboard labels, empty states, or responsive layout in an existing page.
- Report a catalogue correction with an official provider source.
- Improve an issue reproduction or add a regression test for a confirmed bug.

Avoid starting with authentication, authorization, database migrations, release workflows, verifier networking, or publication policy unless a maintainer has agreed to mentor the change. These areas have security or data-integrity implications.

## Get the project running

1. Install Git, Node.js 24.x, Go 1.25+, and Docker with Compose v2.
2. Clone the repository and switch to `dev`.
3. Run `npm run setup:local` from the repository root. Setup requires Go 1.25+ and validates both Go services.
4. Start the app with `npm run dev` and open http://localhost:3000.
5. Read [SETUP.md](SETUP.md) if you need the detailed setup or troubleshooting steps.

The setup script creates a local `.env` if needed, generates a local-only auth secret, installs the lockfile dependencies, starts PostgreSQL, applies committed migrations, and seeds categories. It does not create an administrator or publish sample APIs.

## Before opening a pull request

- Search existing issues and PRs first.
- For substantial work, discuss the approach in an issue.
- Create a short-lived branch from the latest `dev`.
- Include a focused test and update documentation in the same PR.
- Run `npm run verify:go`, `npm test`, plus relevant integration, lint, typecheck, and build checks.
- Target `dev`, describe the behavior change, and disclose anything you could not test.

## Catalogue data standards

Only use official provider sources for API facts. Link documentation and homepage, and cite evidence for authentication, pricing, rate limits, terms, geography, and restrictions. Unknown values should remain unknown. Never submit secrets, credentials, private data, or copied provider content without permission.

## Need help?

- [Open issues](https://github.com/yyyuvvvraj/APIVault/issues)
- [Suggest an API](https://github.com/yyyuvvvraj/APIVault/issues/new?template=api_submission.yml)
- [Contribution guide](../CONTRIBUTING.md)
- [Code of Conduct](../CODE_OF_CONDUCT.md)
- [Security policy](../SECURITY.md)

Maintainers review contributions for correctness, security, evidence quality, accessibility, and maintainability. A passing CI run is necessary but not a substitute for review.
