#!/usr/bin/env python3
"""Build a review-only disposition report from immutable discovery and research artifacts.

A READY result means only that the page is suitable for maintainer inspection.
It never verifies, imports, or publishes an API.
"""
from __future__ import annotations

import argparse
import glob
import json
import os
from urllib.parse import urlparse


def read_json(path: str) -> dict:
    with open(path, encoding="utf-8") as handle:
        value = json.load(handle)
    if not isinstance(value, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return value


def safe_url(value: object):
    if not isinstance(value, str) or not value or len(value) > 2048:
        return None
    try:
        parsed = urlparse(value)
    except ValueError:
        return None
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        return None
    if parsed.username or parsed.password:
        return None
    return parsed


def evaluate(record: dict, original_url: str, canonical_url: str) -> tuple[str, list[str]]:
    research = record.get("research") or {}
    original = safe_url(original_url)
    canonical = safe_url(canonical_url)
    resolved = safe_url(research.get("resolvedUrl"))
    links = research.get("candidateLinks") or []

    docs_found = any(
        isinstance(link, dict)
        and isinstance(link.get("kind"), str)
        and any(token in link["kind"].lower() for token in ("doc", "api reference", "developer"))
        and (parsed := safe_url(link.get("url"))) is not None
        and parsed.scheme == "https"
        and canonical is not None
        and parsed.hostname.lower() == canonical.hostname.lower()
        for link in links
    )

    checks = [
        (bool(str(record.get("name") or "").strip() and original and canonical),
         "Name and source URLs must be valid HTTP(S) URLs without embedded credentials."),
        (canonical is not None and canonical.scheme == "https",
         "Canonical provider URL must use HTTPS."),
        (research.get("fetchStatus") == "FETCHED"
         and isinstance(research.get("httpStatus"), int)
         and 200 <= research["httpStatus"] < 300,
         "Provider page fetch must return a successful 2xx response."),
        (canonical is not None and resolved is not None
         and resolved.scheme == "https"
         and resolved.hostname.lower() == canonical.hostname.lower(),
         "Final page must remain on the canonical HTTPS hostname."),
        (bool(str(research.get("title") or "").strip()
              and str(research.get("description") or "").strip()),
         "Fetched page must expose both a title and description."),
        (docs_found,
         "At least one HTTPS API documentation link on the canonical hostname must be found."),
    ]
    blockers = [detail for passed, detail in checks if not passed]
    return ("READY_FOR_MAINTAINER_REVIEW" if not blockers else "REVIEW_REQUIRED", blockers)


def build_report(queue_path: str, research_dir: str, expected: int) -> dict:
    queue = read_json(queue_path)
    candidates = queue.get("candidates")
    if not isinstance(candidates, list) or len(candidates) != expected:
        raise ValueError(f"Expected {expected} queue candidates; found {len(candidates) if isinstance(candidates, list) else 'invalid'}")
    source_revision = queue.get("sourceRevision")
    if not isinstance(source_revision, str) or len(source_revision) != 40:
        raise ValueError("Queue must include a 40-character sourceRevision")

    leads: dict[str, dict] = {}
    for index, candidate in enumerate(candidates):
        if not isinstance(candidate, dict):
            raise ValueError(f"Queue candidate {index} is not an object")
        review_id = candidate.get("reviewId")
        if not isinstance(review_id, str) or not review_id:
            raise ValueError(f"Queue candidate {index} is missing reviewId")
        if review_id in leads:
            raise ValueError(f"Duplicate queue reviewId: {review_id}")
        leads[review_id] = candidate

    research_records: dict[str, dict] = {}
    paths = sorted(glob.glob(os.path.join(research_dir, "research-*.json")))
    if not paths:
        raise ValueError(f"No research-*.json batch artifacts found in {research_dir}")
    for path in paths:
        report = read_json(path)
        records = report.get("records")
        if not isinstance(records, list) or report.get("leadCount") != len(records):
            raise ValueError(f"Invalid research batch report: {os.path.basename(path)}")
        for record in records:
            review_id = record.get("reviewId") if isinstance(record, dict) else None
            if not isinstance(review_id, str) or not review_id:
                raise ValueError(f"Research batch {os.path.basename(path)} has a record without reviewId")
            if review_id in research_records:
                raise ValueError(f"Duplicate research reviewId: {review_id}")
            research_records[review_id] = record

    if set(research_records) != set(leads):
        missing = len(set(leads) - set(research_records))
        unexpected = len(set(research_records) - set(leads))
        raise ValueError(f"Research/queue ID mismatch: {missing} missing research records, {unexpected} unexpected records")

    output_records = []
    for review_id, lead in leads.items():
        research_record = research_records[review_id]
        name = str(lead.get("name") or research_record.get("name") or "").strip()
        original_url = str(lead.get("originalUrl") or research_record.get("sourceUrl") or "").strip()
        canonical_url = str(lead.get("canonicalUrl") or research_record.get("canonicalUrl") or "").strip()
        priority = str(lead.get("priority") or research_record.get("priority") or "").upper()
        if priority not in {"HIGH", "NORMAL", "LOW"}:
            raise ValueError(f"Record {review_id} has invalid priority {priority!r}")
        if not name or not original_url or not canonical_url:
            raise ValueError(f"Record {review_id} is missing name or source URLs")

        disposition, blockers = evaluate(research_record, original_url, canonical_url)
        output_records.append({
            "reviewId": review_id,
            "name": name,
            "originalUrl": original_url,
            "canonicalUrl": canonical_url,
            "sourceCategory": lead.get("sourceCategory") or research_record.get("sourceCategory") or "",
            "suggestedCategory": lead.get("suggestedCategory") or research_record.get("suggestedCategory") or "",
            "priority": priority,
            "disposition": disposition,
            "evidenceIssues": blockers,
            "automatedResearch": {
                "hostname": research_record.get("hostname"),
                "research": research_record.get("research"),
            },
            "importEligible": False,
            "verificationStatus": "UNVERIFIED",
            "publicationStatus": "NOT_PUBLISHED",
            "humanReviewRequired": True,
        })

    output_records.sort(key=lambda item: item["reviewId"])
    return {
        "sourceRevision": source_revision,
        "sourceTotal": expected,
        "processed": len(output_records),
        "records": output_records,
        "policy": "Automated page checks only prepare maintainer review. No API verification, import, or publication is performed.",
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--queue", required=True)
    parser.add_argument("--research-dir", required=True)
    parser.add_argument("--expected", type=int, required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    if args.expected < 1:
        raise SystemExit("--expected must be positive")
    report = build_report(args.queue, args.research_dir, args.expected)
    os.makedirs(os.path.dirname(args.output) or ".", exist_ok=True)
    with open(args.output, "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2, ensure_ascii=False)
        handle.write("\n")
    ready = sum(item["disposition"] == "READY_FOR_MAINTAINER_REVIEW" for item in report["records"])
    print(f"Prepared {len(report['records'])} review-only leads: {ready} ready for maintainer inspection, {len(report['records']) - ready} requiring further review.")


if __name__ == "__main__":
    main()
