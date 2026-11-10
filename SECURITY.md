# Security Policy

## Supported versions
APIVault is in its initial development phase. Security fixes are applied to the latest code on `dev`. Once stable releases are published, supported versions will be documented here.

## Reporting a vulnerability
Please do not report exploitable vulnerabilities in public issues.

Use GitHub's **Report a vulnerability** feature on the repository's Security tab when available. Include:
- A concise description and potential impact.
- Steps to reproduce or a proof of concept that does not expose real user data.
- Affected commit, branch, or version.
- Any suggested mitigation.

Please allow maintainers reasonable time to investigate and coordinate a fix before public disclosure.

## Scope
Do not test against third-party APIs or infrastructure without authorization. Never include live credentials, access tokens, private keys, or personal data in a report.

## Dependency vulnerability monitoring

Dependabot is configured through `.github/dependabot.yml` to check the root npm dependencies, the Go verifier module, both Docker build directories, and GitHub Actions weekly. It opens dependency update pull requests and groups compatible npm updates to reduce review noise.

Review Dependabot pull requests like other code changes: inspect the changelog and release notes, run the relevant CI workflows, and verify application and container behavior before merging. Security alerts and Dependabot pull requests are signals for maintainer review; they do not replace code review, lockfile integrity checks, or vulnerability triage.


## Static application security analysis

The `.github/workflows/codeql.yml` workflow runs GitHub CodeQL analysis for JavaScript/TypeScript and Go on pull requests and pushes to `dev` and `stable`, with a weekly scheduled scan. Findings must be triaged by a maintainer; the existence of the workflow or a clean scan is not a substitute for a security review of deployment configuration, secrets, database access, or third-party infrastructure.

Treat critical findings as release blockers. Resolve high-severity findings or record an explicit owner, impact assessment, and mitigation before the v0.5.0 release candidate is approved.
