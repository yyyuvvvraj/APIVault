# Contributing to APIVault

Thank you for helping make APIVault useful and trustworthy. Contributions include code, API listings, data corrections, tests, documentation, translations, and issue reports.

## Before you start
1. Search existing issues and pull requests to avoid duplicate work.
2. For substantial changes, open an issue first.
3. Never submit secrets, private keys, personal data, or credentials.
4. Only submit API information that can be shared publicly and has been checked against a reliable source.

## Development workflow
1. Fork the repository (external contributors) or clone it (collaborators).
2. Update your integration branch: `git switch dev && git pull origin dev`.
3. Create a descriptive branch: `git switch -c feature/short-description`.
4. Make focused commits with clear messages, e.g. `feat: add API source metadata`.
5. Run relevant checks locally.
6. Push your branch and open a pull request targeting **dev**.
7. Explain the motivation, changes, testing performed, and limitations.
8. Address review feedback. Maintainers merge only after required checks pass.

Do not open routine feature PRs against `stable`. Release PRs are managed by maintainers.

## API listing quality
Every proposed listing should, where applicable, include:
- Official API name and provider.
- Official documentation and homepage URLs.
- A concise, factual description.
- Category and useful tags.
- Authentication requirements.
- Pricing and rate-limit information, with links to authoritative sources.
- Geographic, account, or usage restrictions.
- Date the information was checked.

Do not describe an API as free, unlimited, open, or production-ready without evidence. Mark unknown details as unknown rather than guessing. Do not imply affiliation or endorsement by an API provider.

## Pull request standards
- Keep PRs focused and reasonably small.
- Include tests or explain why tests are not applicable.
- Update documentation when behaviour or data formats change.
- Do not commit generated files unless maintainers request them.
- Ensure automated checks pass.
- Be respectful and constructive in review discussions.

## Branch conventions
Use lowercase, hyphen-separated names:
- `feature/*` — new capabilities
- `bugfix/*` — non-emergency bug fixes
- `hotfix/*` — urgent production fixes
- `docs/*` — documentation
- `test/*` — tests
- `refactor/*` — internal restructuring

## Recognition
Meaningful contributions are valued regardless of size. Maintainers may highlight contributors in release notes and project documentation with their permission.
