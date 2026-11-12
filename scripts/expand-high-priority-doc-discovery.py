#!/usr/bin/env python3
"""Expand API-documentation evidence using safe, bounded same-host path probes.

This is read-only reconnaissance. It never imports, verifies, or publishes APIs.
"""
from __future__ import annotations

import argparse
import concurrent.futures
import importlib.util
import json
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse, urlunparse

RESEARCH_SCRIPT = Path(__file__).with_name("catalogue-high-priority-research.py")
SPEC = importlib.util.spec_from_file_location("apivault_high_priority_research", RESEARCH_SCRIPT)
RESEARCH = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(RESEARCH)

PROBE_PATHS = (
    "/docs",
    "/api/docs",
    "/docs/api",
    "/developers",
    "/api/reference",
    "/reference",
    "/swagger",
    "/openapi.json",
    "/swagger.json",
    "/api/openapi.json",
    "/developers/docs",
    "/documentation",
)
API_SIGNALS = ("api", "endpoint", "rest", "openapi", "swagger", "reference", "developer")


def safe_https(value: object):
    if not isinstance(value, str):
        return None
    try:
        parsed = urlparse(value)
    except ValueError:
        return None
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        return None
    return parsed


def same_provider_domain(left: str, right: str) -> bool:
    left, right = left.lower().rstrip("."), right.lower().rstrip(".")
    return left == right or left.endswith("." + right) or right.endswith("." + left)


def is_api_documentation(page: dict, homepage_host: str) -> bool:
    requested = safe_https(page.get("requestedUrl") or page.get("resolvedUrl"))
    resolved = safe_https(page.get("resolvedUrl"))
    status = page.get("httpStatus")
    if not requested or not resolved or not isinstance(status, int) or not 200 <= status < 300:
        return False
    if not same_provider_domain(requested.hostname, homepage_host):
        return False
    if not same_provider_domain(resolved.hostname, homepage_host):
        return False
    content_type = str(page.get("contentType") or "").lower()
    if "html" not in content_type and "json" not in content_type:
        return False
    metadata = (str(page.get("title") or "") + " " + str(page.get("description") or "")).lower()
    return any(signal in metadata for signal in API_SIGNALS)


def has_existing_api_docs(research: dict, homepage_host: str) -> bool:
    for page in research.get("followUpPages") or []:
        if page.get("kind") != "API_DOCUMENTATION" or page.get("fetchStatus") != "FETCHED":
            continue
        if is_api_documentation({
            "requestedUrl": page.get("url"),
            "resolvedUrl": page.get("resolvedUrl"),
            "httpStatus": page.get("httpStatus"),
            "contentType": page.get("contentType"),
            "title": page.get("title"),
            "description": page.get("description"),
        }, homepage_host):
            return True
    return False


def probe_host(homepage_url: str, fetch_page=None, timeout: float = 4.0) -> dict:
    fetch = fetch_page or RESEARCH.fetch_page
    homepage = safe_https(homepage_url)
    if not homepage:
        return {"pages": [], "attempted": 0, "reason": "homepage_not_https"}
    root = urlunparse((homepage.scheme, homepage.netloc, "/", "", "", ""))
    pages, attempted = [], 0
    seen = set()
    for path in PROBE_PATHS:
        url = urlunparse((homepage.scheme, homepage.netloc, path, "", "", ""))
        if url in seen:
            continue
        seen.add(url)
        attempted += 1
        result = fetch(url, timeout=timeout)
        if is_api_documentation(result, homepage.hostname):
            pages.append({
                "kind": "API_DOCUMENTATION",
                "url": result.get("requestedUrl") or url,
                "linkText": "Discovered by bounded documentation-path probe",
                "evidenceStatus": "UNVERIFIED_CANDIDATE",
                "fetchStatus": "FETCHED",
                "httpStatus": result.get("httpStatus"),
                "resolvedUrl": result.get("resolvedUrl"),
                "contentType": result.get("contentType"),
                "title": result.get("title", ""),
                "description": result.get("description", ""),
                "error": None,
                "attempts": 1,
                "observedAt": result.get("observedAt"),
            })
            break
    return {"pages": pages, "attempted": attempted, "reason": "documentation_found" if pages else "no_matching_documentation_path"}


def load_reports(research_dir: Path) -> dict:
    records = {}
    for path in sorted(research_dir.glob("research-*.json")):
        report = json.loads(path.read_text(encoding="utf-8"))
        batch = report.get("records")
        if not isinstance(batch, list) or report.get("leadCount") != len(batch):
            raise ValueError(f"Invalid research batch: {path.name}")
        for record in batch:
            review_id = record.get("reviewId")
            if not isinstance(review_id, str) or not review_id or review_id in records:
                raise ValueError(f"Missing or duplicate research reviewId in {path.name}: {review_id!r}")
            records[review_id] = record
    return records


def expand(queue_path: Path, research_dir: Path, output_path: Path, expected: int,
           workers: int = 20, timeout: float = 4.0, fetch_page=None) -> dict:
    queue = json.loads(queue_path.read_text(encoding="utf-8"))
    leads = queue.get("candidates")
    if not isinstance(leads, list) or len(leads) != expected:
        raise ValueError(f"Expected {expected} leads; got {len(leads) if isinstance(leads, list) else 'invalid'}")
    lead_ids = [item.get("reviewId") for item in leads]
    if any(not isinstance(x, str) or not x for x in lead_ids) or len(set(lead_ids)) != len(lead_ids):
        raise ValueError("Queue contains missing or duplicate review IDs")
    records = load_reports(research_dir)
    if set(records) != set(lead_ids):
        raise ValueError(f"Queue/research mismatch: queue={len(lead_ids)}, research={len(records)}")

    host_groups = {}
    for lead in leads:
        record = records[lead["reviewId"]]
        research = record.get("research") or {}
        homepage = safe_https(lead.get("canonicalUrl") or lead.get("originalUrl"))
        resolved = safe_https(research.get("resolvedUrl"))
        if not homepage or not resolved or not same_provider_domain(homepage.hostname, resolved.hostname):
            continue
        if research.get("fetchStatus") != "FETCHED" or not isinstance(research.get("httpStatus"), int) or not 200 <= research["httpStatus"] < 300:
            continue
        if has_existing_api_docs(research, homepage.hostname):
            continue
        host_groups.setdefault(homepage.hostname, {
            "homepageUrl": lead.get("canonicalUrl") or lead.get("originalUrl"),
            "reviewIds": [],
        })["reviewIds"].append(lead["reviewId"])

    results = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, min(workers, 32))) as pool:
        futures = {
            pool.submit(probe_host, item["homepageUrl"], fetch_page, timeout): host
            for host, item in host_groups.items()
        }
        for future in concurrent.futures.as_completed(futures):
            results[futures[future]] = future.result()

    added = 0
    for host, item in host_groups.items():
        result = results[host]
        if not result["pages"]:
            continue
        for review_id in item["reviewIds"]:
            research = records[review_id].setdefault("research", {})
            existing = research.setdefault("followUpPages", [])
            known = {page.get("url") for page in existing}
            for page in result["pages"]:
                if page["url"] not in known:
                    existing.append(page)
                    known.add(page["url"])
                    added += 1

    output_path.parent.mkdir(parents=True, exist_ok=True)
    report = {
        "schemaVersion": "1",
        "leadCount": len(leads),
        "uniqueHostsProbed": len(host_groups),
        "hostsWithDocumentationFound": sum(bool(item["pages"]) for item in results.values()),
        "probeRequests": sum(item["attempted"] for item in results.values()),
        "newDocumentationEvidenceRecords": added,
        "probeDispositionCounts": dict(Counter(item["reason"] for item in results.values())),
        "policy": "READ_ONLY_RECONNAISSANCE_ONLY: discovered pages remain UNVERIFIED_CANDIDATE; no database import, verification, or publication.",
        "records": [records[review_id] for review_id in sorted(lead_ids)],
    }
    output_path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return {key: value for key, value in report.items() if key != "records"}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--queue", required=True, type=Path)
    parser.add_argument("--research-dir", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--expected", type=int, default=1161)
    parser.add_argument("--workers", type=int, default=20)
    parser.add_argument("--timeout", type=float, default=4.0)
    args = parser.parse_args()
    report = expand(args.queue, args.research_dir, args.output, args.expected,
                    max(1, min(args.workers, 32)), max(1.0, min(args.timeout, 8.0)))
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
