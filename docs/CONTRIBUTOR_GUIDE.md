# APIVault contributor guide

Welcome to the APIVault community. Contributions help developers discover APIs with accurate, current, and traceable information. Every suggestion enters a review queue; submitting an API does not publish it or mark it verified.

## Before submitting

1. Sign in to your APIVault account.
2. Check the public catalogue for an existing API before creating a new entry.
3. Prefer the API provider's own website and documentation. Third-party directories are useful discovery leads, not authoritative evidence.
4. Open each source and confirm that it supports the field you are submitting.
5. If pricing, authentication, rate limits, or availability cannot be confirmed, use the available `UNKNOWN` value or leave optional details blank. Do not infer facts.

## Evidence checklist

For a new API, provide:
- The official API or provider homepage over HTTPS.
- Official documentation when available.
- A separate official pricing page if you describe a pricing model or price.
- Official authentication documentation if you specify authentication methods.
- Public source URLs that a reviewer can open without your credentials.

Keep evidence focused. Do not submit private dashboards, account-specific URLs, API keys, passwords, tokens, personal data, or copied proprietary documentation. A URL being public does not automatically grant permission to republish its contents; respect provider terms and attribution requirements.

## What happens after submission

1. **Pending:** the suggestion has been received and is waiting for review.
2. **In review:** a maintainer is checking completeness, evidence, possible duplicates, and policy fit.
3. **Needs changes / rejected:** read the review note in **Account → My submissions**. If changes are requested, submit a corrected suggestion with the missing evidence. Do not repeatedly resubmit an unchanged item.
4. **Approved:** the suggestion passed the community review step. Approval alone is not a claim that every operational detail has been independently verified or that publication is immediate; maintainers complete the catalogue verification/publication process.

Review time can vary with queue size and evidence quality. APIVault does not promise a fixed review SLA.

## Updating an existing API

Choose **Update existing API** and select the correct catalogue record. Explain what changed through the submitted metadata and attach current official sources. Prefer small, evidence-backed updates. Do not create a second API record to represent a new endpoint, version, SDK, or mirror of an existing product.

## Contributor profile and privacy

Contributor profiles are private by default. You choose whether to make a profile public from **Account → Contributor profile**.

When public, the profile page exposes the display name, handle, optional bio, optional website and GitHub links, profile join month, and count of approved contributions. Your email address and account ID are not displayed. Keep personal contact details out of your bio and external links if you do not want them public. You can switch public visibility off from the same profile form.

## Community standards

- Submit accurate information and cite the official source for important claims.
- Disclose uncertainty; do not guess pricing, authentication, limits, or availability.
- Do not submit secrets, credentials, private data, spam, or malicious URLs.
- Do not create duplicate submissions to gain visibility.
- Be respectful when responding to maintainer feedback.
- Maintainers may edit, defer, or reject submissions to protect catalogue quality and provider terms.

## Useful account pages

- `/submit` — suggest a new API or an evidence-backed update.
- `/account/submissions` — track review status and maintainer notes.
- `/account/profile` — manage your optional public contributor profile.


## Profile visibility checks

Before enabling public visibility, review the exact fields shown in the profile form. Public profiles expose only the display name, handle, optional bio, optional website/GitHub links, join month, and approved-contribution count. They do not expose account email, internal user IDs, submission contents, review notes, or pending/rejected contribution counts. You can make the profile private again at any time; public profile pages and API responses then return not found.
