#!/usr/bin/env python3
"""Validate a report-only API manifest before staging it in the catalogue.

This gate intentionally permits only PENDING_REVIEW records with no official
source assertions. It never approves, verifies, features, or publishes APIs.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from urllib.parse import urlparse


def https_url(value: object) -> bool:
    if not isinstance(value, str) or not value or len(value) > 2048:
        return False
    try:
        parsed = urlparse(value)
    except ValueError:
        return False
    return parsed.scheme == "https" and bool(parsed.hostname) and not parsed.username and not parsed.password


def validate(manifest: dict) -> list[str]:
    errors: list[str] = []
    apis = manifest.get("apis")
    dataset = manifest.get("dataset")
    if not isinstance(apis, list) or not apis:
        return ["manifest.apis must be a non-empty array"]
    if len(apis) > 1000:
        errors.append("manifest exceeds the 1,000-record staging limit")
    if not isinstance(dataset, dict) or not all(
        isinstance(dataset.get(key), str) and dataset[key].strip()
        for key in ("name", "version", "license", "attribution")
    ) or not https_url(dataset.get("sourceUrl")):
        errors.append("dataset provenance is incomplete or invalid")

    seen_slugs: set[str] = set()
    seen_hosts: set[str] = set()
    for index, api in enumerate(apis):
        prefix = f"apis[{index}]"
        if not isinstance(api, dict):
            errors.append(f"{prefix} must be an object")
            continue
        slug = api.get("slug")
        if not isinstance(slug, str) or not slug:
            errors.append(f"{prefix}.slug is required")
        elif slug in seen_slugs:
            errors.append(f"{prefix}.slug is duplicated: {slug}")
        else:
            seen_slugs.add(slug)

        if api.get("verificationStatus") != "PENDING_REVIEW":
            errors.append(f"{prefix} must remain PENDING_REVIEW")
        if api.get("featured") is True:
            errors.append(f"{prefix} cannot be featured before verification")
        if api.get("status") not in (None, "ACTIVE"):
            errors.append(f"{prefix}.status must be ACTIVE or omitted")
        if not isinstance(api.get("name"), str) or not api["name"].strip():
            errors.append(f"{prefix}.name is required")
        if not isinstance(api.get("summary"), str) or not api["summary"].strip():
            errors.append(f"{prefix}.summary is required")
        if not https_url(api.get("homepageUrl")) or not https_url(api.get("documentationUrl")):
            errors.append(f"{prefix} requires HTTPS homepage and documentation URLs")

        provider = api.get("provider")
        if not isinstance(provider, dict) or not provider.get("slug") or not provider.get("name"):
            errors.append(f"{prefix}.provider requires slug and name")
        else:
            host = urlparse(api["homepageUrl"]).hostname.lower().rstrip(".") if https_url(api.get("homepageUrl")) else ""
            if host and host in seen_hosts:
                errors.append(f"{prefix} duplicates provider homepage host {host}")
            elif host:
                seen_hosts.add(host)

        if not isinstance(api.get("categories"), list) or not api["categories"]:
            errors.append(f"{prefix}.categories must be non-empty")
        if not isinstance(api.get("authMethods"), list) or not api["authMethods"]:
            errors.append(f"{prefix}.authMethods must be explicitly classified")
        sources = api.get("sources")
        if not isinstance(sources, list) or not sources:
            errors.append(f"{prefix}.sources must be non-empty")
            continue
        source_urls: set[str] = set()
        for source_index, source in enumerate(sources):
            source_prefix = f"{prefix}.sources[{source_index}]"
            if not isinstance(source, dict) or not https_url(source.get("url")):
                errors.append(f"{source_prefix}.url must be a valid HTTPS URL")
                continue
            if source.get("isOfficial") is not False:
                errors.append(f"{source_prefix}.isOfficial must be false until a maintainer attests ownership")
            if source["url"] in source_urls:
                errors.append(f"{source_prefix}.url is duplicated")
            source_urls.add(source["url"])
    return errors


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True, type=Path)
    args = parser.parse_args()
    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    if not isinstance(manifest, dict):
        raise SystemExit("manifest must be a JSON object")
    errors = validate(manifest)
    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        raise SystemExit(1)
    print(f"Safety gate passed: {len(manifest['apis'])} candidates; all PENDING_REVIEW, unfeatured, and with zero official-source assertions.")


if __name__ == "__main__":
    main()
