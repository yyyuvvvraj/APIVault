# Development workflow

## Branch model
- `dev`: default integration branch for accepted work.
- `feature/*`, `bugfix/*`, `docs/*`, `test/*`, `refactor/*`: short-lived branches based on `dev`.
- `release/vX.Y.Z`: temporary stabilization branch created by maintainers when preparing a release.
- `stable`: production-ready code only.

## Feature contribution

```bash
git clone https://github.com/yyyuvvvraj/APIVault.git
cd APIVault
git switch dev
git pull origin dev
git switch -c feature/short-description

# Make and test your changes.
git add .
git commit -m "feat: describe the change"
git push -u origin feature/short-description
```

Open a pull request from your branch into `dev`. External contributors should work in a fork and select the fork branch as the PR head.

## Documentation is part of the change

Every feature, bug fix, schema change, API contract change, security change, and contributor workflow change must update its relevant documentation in the same pull request. Do not defer documentation to a later cleanup PR.

At minimum, review the relevant pages in `docs/`, `README.md`, and `CHANGELOG.md`. Update local setup instructions when commands or configuration change, the data model when the schema changes, and API examples/contracts when endpoints change. If no documentation change is needed, explain why in the PR description.

## Release process
1. Confirm CI is green on `dev`.
2. Create `release/vX.Y.Z` from the selected `dev` commit.
3. Update changelog, version metadata, and release documentation.
4. Test the release candidate and fix only release-blocking defects.
5. Open a pull request from the release branch into `stable`.
6. After merge, create a version tag `vX.Y.Z` on the resulting stable commit and publish GitHub Release notes.
7. Merge release-only fixes back into `dev`.
8. Delete the temporary release branch after completion.

## Emergency fix
Create `hotfix/short-description` from `stable`, make the smallest safe fix, test it, and open a PR into `stable`. Tag a patch release after merge, then merge the fix back into `dev`.

## Merge policy
Use squash merges for routine feature PRs to keep integration history readable. Do not bypass required checks or branch protections except under a documented, exceptional recovery procedure.
