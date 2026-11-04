# APIVault release strategy

## Release philosophy

APIVault will ship incremental, traceable releases during development. The 0.x series communicates meaningful progress and gives maintainers and early adopters a concrete record of what changed. **v1.0.0 is the first official general-availability launch.**

Pre-1.0 releases may be published as GitHub prereleases for testers and contributors. They are not the stable public launch.

## Version sequence

| Version | Purpose | GitHub Release classification |
| --- | --- | --- |
| 0.0.1 | Existing initial development release | Preserve historical release and tag; consider prerelease/early-access relabel |
| 0.1.0 | First consolidated development milestone | Prerelease |
| 0.2.0 | Next meaningful feature milestone | Prerelease |
| 0.3.0 onward | Further development milestones | Prerelease |
| 1.0.0 | First official general-availability launch | Stable release |

This sequence is illustrative. Release when a coherent, tested milestone is ready, not on an arbitrary calendar.

## Semantic versioning rules

Before 1.0.0:
- Increment the minor version for a meaningful feature milestone (0.1.0 to 0.2.0).
- Increment the patch version for fixes and small compatible improvements (0.1.0 to 0.1.1).
- Use prerelease identifiers such as 0.2.0-rc.1 only for candidates needing explicit external testing.
- Breaking changes may occur during 0.x, but must be documented clearly.

At and after 1.0.0:
- Follow normal Semantic Versioning: patch for compatible fixes, minor for compatible functionality, major for breaking public-contract changes.
- Keep the REST API compatibility promises aligned with the published policy.

## Required release record

Every release must have:
1. A versioned CHANGELOG.md entry with relevant Added, Changed, Fixed, Security and/or Removed sections.
2. A GitHub Release with user-facing notes, known limitations and upgrade guidance where relevant.
3. A source tag pointing to the exact reviewed commit.
4. A package version matching the tag.
5. A commit already contained in stable, as enforced by the release workflow.
6. Passing required CI, integration, browser and container checks for that exact release commit.
7. A record of known issues and operational limitations.

Do not create release tags from unreviewed feature branches or bypass stable-branch ancestry checks.

## Release workflow

1. Merge completed work into dev through reviewed pull requests.
2. Keep the changelog Unreleased section current as changes land.
3. For a coherent milestone, prepare a release PR: move accumulated notes into a versioned heading, set the package version, update docs and record known limitations.
4. Validate the candidate on the exact commit.
5. Promote the approved commit to stable through the protected branch workflow. Never force-push or rewrite stable history to make a tag pass.
6. Create the matching vX.Y.Z tag only on a commit contained in stable.
7. GitHub Actions validates tag ancestry, package version and changelog entry, then publishes the release.
8. Publish 0.x GitHub Releases as prereleases. Publish 1.0.0 and later stable releases as normal releases.
9. Run post-release smoke checks and record the outcome.

## Existing v0.0.1

The v0.0.1 tag and release are part of project history and must not be deleted or rewritten. Its current GitHub Release is marked as a normal release. Maintainers should decide whether to edit its release metadata to mark it as prerelease/early access. Do not claim v1.0.0 is literally the first GitHub Release; it is the first official general-availability launch.

## What qualifies as v1.0.0

The first stable launch is not triggered by a date or number of merged PRs. It happens only after all gates in V1_RELEASE_CHECKLIST.md and RELEASE_READINESS.md are evidenced and signed off.

The public launch requires a reliable website, working discovery and developer workflows, secure API keys, functioning submissions and moderation, useful verified catalogue data, a polished mobile experience, no unresolved critical security vulnerabilities, passing essential CI, tested backup and restore, operational deployment and monitoring, launch-ready documentation, and correct license/release metadata.

## Changelog discipline

- Every merged PR changing user-visible behaviour, APIs, operations or contributor workflows updates the changelog in the same PR.
- Keep entries concise and written from the user's perspective.
- Group changes by category and link PRs/issues where useful.
- Do not describe unfinished or review-only features as generally available.
- At release time, freeze the versioned entry so the GitHub Release is reproducible from the tag.
