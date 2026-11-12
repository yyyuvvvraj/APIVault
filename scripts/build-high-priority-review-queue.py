#!/usr/bin/env python3
"""Build a report-only maintainer queue from high-priority research and live checks."""
from __future__ import annotations
import argparse, hashlib, json
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse

def load(path: Path) -> dict:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"{path} must contain an object")
    return value

def host(value: str) -> str:
    return (urlparse(value).hostname or "").lower().rstrip(".")

def build_queue(manifest: dict, research: dict, validation: dict) -> dict:
    apis, records, results = manifest.get("apis"), research.get("records"), validation.get("results")
    if not all(isinstance(x, list) for x in (apis, records, results)):
        raise ValueError("apis, records, and results must be arrays")
    by_id = {}
    for record in records:
        rid = record.get("reviewId")
        if not rid or rid in by_id:
            raise ValueError(f"missing or duplicate reviewId: {rid!r}")
        by_id[rid] = record
    by_slug = {}
    for result in results:
        slug = result.get("slug")
        if not slug or slug in by_slug:
            raise ValueError(f"missing or duplicate validation slug: {slug!r}")
        by_slug[slug] = result

    entries, counts = [], Counter()
    for api in apis:
        slug = api.get("slug", "")
        suffix = slug.rsplit("-", 1)[-1]
        matches = [r for rid, r in by_id.items() if hashlib.sha256(rid.encode()).hexdigest()[:8] == suffix]
        if len(matches) != 1:
            raise ValueError(f"{slug} maps to {len(matches)} research records")
        record = matches[0]
        research_data = record.get("research") or {}
        checked = by_slug.get(slug)
        if checked is None:
            raise ValueError(f"missing live-validation result for {slug}")
        checks = checked.get("checks") or []
        failures = [c for c in checks if not c.get("reachable") or not (200 <= int(c.get("statusCode") or 0) < 400) or not str(c.get("finalUrl") or "").startswith("https://")]
        links = {}
        for page in research_data.get("candidateLinks") or []:
            kind = str(page.get("kind") or "OTHER")
            links.setdefault(kind, []).append({"url": page.get("url"), "label": page.get("linkText") or "", "fetchStatus": "NOT_FETCHED", "evidenceStatus": "UNVERIFIED_CANDIDATE"})
        followups = research_data.get("followUpPages") or []
        for page in followups:
            kind = str(page.get("kind") or "OTHER")
            links.setdefault(kind, []).append({
                "url": page.get("url"), "resolvedUrl": page.get("resolvedUrl"),
                "label": page.get("linkText") or "", "title": page.get("title") or "",
                "description": page.get("description") or "", "httpStatus": page.get("httpStatus"),
                "fetchStatus": page.get("fetchStatus") or "UNKNOWN", "evidenceStatus": "UNVERIFIED_CANDIDATE"
            })
        claim_evidence = any(links.get(k) for k in ("AUTHENTICATION", "PRICING", "TERMS", "RATE_LIMITS"))
        priority = "RECHECK_LIVE_URLS" if failures else ("REVIEW_WITH_CLAIM_EVIDENCE" if claim_evidence else "REVIEW_PROVIDER_IDENTITY")
        counts[priority] += 1
        entries.append({
            "reviewId": record["reviewId"], "slug": slug, "name": api.get("name"),
            "category": (api.get("categories") or [None])[0], "providerDomain": host(api.get("homepageUrl") or ""),
            "homepageUrl": api.get("homepageUrl"), "documentationUrl": api.get("documentationUrl"),
            "homepageResearch": {k: research_data.get(k) for k in ("httpStatus", "resolvedUrl", "title", "description")},
            "documentationResearch": [p for p in followups if p.get("url") == api.get("documentationUrl")],
            "liveChecks": checks, "liveCheckFailures": failures, "additionalEvidenceCandidates": links,
            "reviewPriority": priority, "providerIdentity": "UNCONFIRMED",
            "officialHomepage": "UNCONFIRMED", "apiDocumentation": "UNCONFIRMED",
            "verificationStatus": "UNVERIFIED", "publicationStatus": "NOT_PUBLISHED",
            "reviewChecklist": [
                "Confirm provider identity using an authoritative provider-controlled source.",
                "Confirm exact homepage and API documentation ownership.",
                "Confirm authentication, pricing, and terms from provider sources; otherwise retain UNKNOWN.",
                "Record a maintainer review note before verification or publication."
            ]
        })
    order = {"REVIEW_WITH_CLAIM_EVIDENCE": 0, "REVIEW_PROVIDER_IDENTITY": 1, "RECHECK_LIVE_URLS": 2}
    entries.sort(key=lambda e: (order[e["reviewPriority"]], (e.get("name") or "").casefold()))
    return {
        "schemaVersion": 1, "sourceTotal": len(records), "candidateTotal": len(entries),
        "generatedAt": validation.get("generatedAt"), "priorityCounts": dict(sorted(counts.items())),
        "policy": "REPORT_ONLY: evidence links are leads, not proof of ownership. No official flags are asserted; no records are imported, verified, or published.",
        "entries": entries
    }

def render_markdown(queue: dict) -> str:
    lines = ["# HIGH-priority API maintainer review queue", "",
        f"- Candidates: **{queue['candidateTotal']}**",
        f"- Research leads: **{queue['sourceTotal']}**",
        f"- Priority counts: {json.dumps(queue['priorityCounts'], sort_keys=True)}",
        "- Provider identity and official-source states remain **UNCONFIRMED**.",
        "- No records are imported, verified, or published.", "",
        "| Priority | API | Homepage | Documentation | Live checks |",
        "|---|---|---|---|---:|"]
    for e in queue["entries"]:
        clean = lambda v: str(v or "").replace("|", "\\|").replace("\n", " ")
        passed = len(e["liveChecks"]) - len(e["liveCheckFailures"])
        lines.append(f"| {e['reviewPriority']} | {clean(e['name'])} | [homepage]({clean(e['homepageUrl'])}) | [docs]({clean(e['documentationUrl'])}) | {passed}/{len(e['liveChecks'])} |")
    lines.extend(["", "## Review policy", "", queue["policy"], ""])
    return "\n".join(lines)

def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--manifest", required=True, type=Path)
    p.add_argument("--research", required=True, type=Path)
    p.add_argument("--validation", required=True, type=Path)
    p.add_argument("--json-output", required=True, type=Path)
    p.add_argument("--markdown-output", required=True, type=Path)
    a = p.parse_args()
    manifest = load(a.manifest)
    queue = build_queue(manifest, load(a.research), load(a.validation))
    if queue["candidateTotal"] != len(manifest["apis"]):
        raise ValueError("review queue did not preserve every candidate")
    a.json_output.parent.mkdir(parents=True, exist_ok=True)
    a.markdown_output.parent.mkdir(parents=True, exist_ok=True)
    a.json_output.write_text(json.dumps(queue, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    a.markdown_output.write_text(render_markdown(queue), encoding="utf-8")
    print(f"Prepared {queue['candidateTotal']} review entries: {queue['priorityCounts']}")
    print("All entries remain UNVERIFIED / NOT_PUBLISHED; no database writes occurred.")

if __name__ == "__main__":
    main()
