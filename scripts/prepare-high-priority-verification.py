#!/usr/bin/env python3
"""Build a conservative, non-publishing validation manifest from HIGH-priority research.

Only candidates with a live 2xx homepage and a separately fetched, same-host HTTPS
API documentation page carrying API-specific metadata are emitted. Source references
remain explicitly unofficial until a maintainer confirms provider ownership.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse


CATEGORY_SLUGS = {
    "AI & Machine Learning": "ai-machine-learning",
    "Communication": "communication",
    "Data & Analytics": "data-analytics",
    "Developer Tools": "developer-tools",
    "Finance": "finance",
    "Maps & Geospatial": "maps-geospatial",
    "Media": "media",
    "Productivity": "productivity",
    "Science & Education": "science-education",
    "Weather & Environment": "weather-environment",
}
API_SIGNALS = ("api", "endpoint", "rest", "openapi", "swagger", "reference", "developer")


def safe_https(value: object):
    if not isinstance(value, str) or not value or len(value) > 2048:
        return None
    try:
        parsed = urlparse(value)
    except ValueError:
        return None
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        return None
    return parsed


def same_provider_domain(left: str, right: str) -> bool:
    left = left.lower().rstrip(".")
    right = right.lower().rstrip(".")
    return left == right or left.endswith("." + right) or right.endswith("." + left)


def slugify(value: str, limit: int = 80) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return (slug or "api")[:limit].strip("-") or "api"


def load_json(path: Path) -> dict:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return value


def candidate_for(lead: dict, record: dict) -> tuple[dict | None, str]:
    name = str(lead.get("name") or record.get("name") or "").strip()
    summary = str(lead.get("description") or "").strip()
    homepage = safe_https(lead.get("canonicalUrl") or record.get("canonicalUrl"))
    research = record.get("research") or {}
    resolved_home = safe_https(research.get("resolvedUrl"))
    if not name or not summary or not homepage:
        return None, "missing_name_description_or_https_homepage"
    if research.get("fetchStatus") != "FETCHED" or not isinstance(research.get("httpStatus"), int) or not 200 <= research["httpStatus"] < 300:
        return None, "homepage_fetch_not_successful"
    if not resolved_home or not same_provider_domain(resolved_home.hostname, homepage.hostname):
        return None, "homepage_redirected_or_resolved_off_host"
    if lead.get("priority") != "HIGH" or record.get("priority") != "HIGH":
        return None, "not_high_priority"
    category = CATEGORY_SLUGS.get(str(lead.get("suggestedCategory") or ""))
    if not category:
        return None, "category_not_mapped_to_catalogue"

    docs = []
    for page in research.get("followUpPages") or []:
        page_url = safe_https(page.get("url"))
        final_url = safe_https(page.get("resolvedUrl"))
        if page.get("kind") != "API_DOCUMENTATION":
            continue
        if page.get("fetchStatus") != "FETCHED" or not isinstance(page.get("httpStatus"), int) or not 200 <= page["httpStatus"] < 300:
            continue
        if not page_url or not final_url:
            continue
        if not same_provider_domain(page_url.hostname, homepage.hostname) or not same_provider_domain(final_url.hostname, homepage.hostname):
            continue
        if page_url.geturl() == homepage.geturl():
            continue
        content_type = str(page.get("contentType") or "").lower()
        if "html" not in content_type and "json" not in content_type:
            continue
        metadata = (str(page.get("title") or "") + " " + str(page.get("description") or "")).lower()
        if not any(signal in metadata for signal in API_SIGNALS):
            continue
        docs.append(page)

    if not docs:
        return None, "no_successful_same_host_api_documentation_page"

    docs.sort(key=lambda item: (
        not any(token in (str(item.get("title") or "") + " " + str(item.get("description") or "")).lower()
                for token in ("api reference", "api documentation", "endpoint", "openapi", "swagger")),
        len(str(item.get("url") or "")),
    ))
    selected = docs[0]
    host_slug = slugify(homepage.hostname, 100)
    suffix = hashlib.sha256(str(lead.get("reviewId", "")).encode()).hexdigest()[:8]
    api_slug = f"{slugify(name, 65)}-{suffix}"
    provider_slug = f"{host_slug[:108]}-{hashlib.sha256(homepage.hostname.encode()).hexdigest()[:8]}"
    api = {
        "slug": api_slug,
        "name": name[:180],
        "summary": summary[:280],
        "description": summary,
        "provider": {
            "slug": provider_slug,
            "name": name[:160],
            "description": "",
            "homepageUrl": f"{homepage.scheme}://{homepage.netloc}/",
        },
        "homepageUrl": homepage.geturl(),
        "documentationUrl": str(selected["url"]),
        "pricingModel": "UNKNOWN",
        "status": "ACTIVE",
        "verificationStatus": "PENDING_REVIEW",
        "featured": False,
        "categories": [category],
        "authMethods": [{"method": "UNKNOWN", "details": "Authentication method not established by this automated research."}],
        "sources": [
            {
                "kind": "OFFICIAL_HOMEPAGE",
                "url": homepage.geturl(),
                "title": name[:240],
                "isOfficial": False,
                "notes": "Unconfirmed source-catalogue URL. Provider ownership must be confirmed by a maintainer.",
            },
            {
                "kind": "DOCUMENTATION",
                "url": str(selected["url"]),
                "title": str(selected.get("title") or "API documentation candidate")[:240],
                "isOfficial": False,
                "notes": "Same-host documentation link discovered and fetched successfully; official status remains unconfirmed.",
            },
        ],
    }
    return api, ""


def build_manifest(queue_path: Path, research_dir: Path, expected: int) -> tuple[dict, dict]:
    queue = load_json(queue_path)
    candidates = queue.get("candidates")
    if not isinstance(candidates, list) or len(candidates) != expected:
        raise ValueError(f"Expected {expected} queue leads; found {len(candidates) if isinstance(candidates, list) else 'invalid'}")
    source_revision = queue.get("sourceRevision")
    if not isinstance(source_revision, str) or len(source_revision) != 40:
        raise ValueError("Queue must include a 40-character sourceRevision")

    leads = {}
    for item in candidates:
        review_id = item.get("reviewId") if isinstance(item, dict) else None
        if not isinstance(review_id, str) or not review_id or review_id in leads:
            raise ValueError(f"Missing or duplicate queue reviewId: {review_id!r}")
        leads[review_id] = item

    records = {}
    for path in sorted(research_dir.glob("research-*.json")):
        report = load_json(path)
        batch = report.get("records")
        if not isinstance(batch, list) or report.get("leadCount") != len(batch):
            raise ValueError(f"Invalid research batch: {path.name}")
        for item in batch:
            review_id = item.get("reviewId") if isinstance(item, dict) else None
            if not isinstance(review_id, str) or not review_id or review_id in records:
                raise ValueError(f"Missing or duplicate research reviewId in {path.name}: {review_id!r}")
            records[review_id] = item

    if set(records) != set(leads):
        raise ValueError(
            f"Queue/research mismatch: {len(set(leads) - set(records))} missing, "
            f"{len(set(records) - set(leads))} unexpected"
        )

    apis, reasons = [], Counter()
    for review_id, lead in leads.items():
        api, reason = candidate_for(lead, records[review_id])
        if api:
            apis.append(api)
        else:
            reasons[reason] += 1

    slugs = [api["slug"] for api in apis]
    if len(slugs) != len(set(slugs)):
        raise ValueError("Generated API slugs are not unique")
    hosts = [urlparse(api["homepageUrl"]).hostname for api in apis]
    if len(hosts) != len(set(hosts)):
        raise ValueError("More than one candidate per provider hostname is not allowed")

    generated_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    manifest = {
        "apis": apis,
        "dataset": {
            "name": "public-apis HIGH-priority discovery evidence",
            "sourceUrl": "https://github.com/public-apis/public-apis",
            "version": source_revision,
            "retrievedAt": generated_at,
            "license": "NOASSERTION",
            "attribution": "Discovery leads derived from public-apis/public-apis. Provider ownership, terms, licensing, and API claims remain subject to maintainer review.",
        },
    }
    report = {
        "sourceRevision": source_revision,
        "sourceTotal": expected,
        "candidateCount": len(apis),
        "heldCount": expected - len(apis),
        "heldReasons": dict(sorted(reasons.items())),
        "publicationPolicy": "REPORT_ONLY: no database import, verification, or publication. All generated source references areOfficial=false and every record remains PENDING_REVIEW.",
        "candidateSlugs": slugs,
    }
    return manifest, report


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--queue", required=True, type=Path)
    parser.add_argument("--research-dir", required=True, type=Path)
    parser.add_argument("--expected", required=True, type=int)
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--report", required=True, type=Path)
    args = parser.parse_args()
    manifest, report = build_manifest(args.queue, args.research_dir, args.expected)
    args.manifest.parent.mkdir(parents=True, exist_ok=True)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.manifest.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    args.report.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Prepared {report['candidateCount']} evidence-backed candidates for report-only live validation.")
    print(f"Held {report['heldCount']} leads; no records were imported, verified, or published.")


if __name__ == "__main__":
    main()
