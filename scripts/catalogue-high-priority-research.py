#!/usr/bin/env python3
"""Read-only first-pass reconnaissance for every APIVault discovery lead.

Fetches one representative URL per hostname, extracts page metadata and likely
documentation/policy links, and emits candidate research. No claim is verified.
"""
from __future__ import annotations
import argparse, concurrent.futures, datetime as dt, html, ipaddress, json, os, re, socket, time
from collections import Counter, defaultdict
from html.parser import HTMLParser
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse, urlunparse
from urllib.request import HTTPRedirectHandler, Request, build_opener

USER_AGENT = "APIVaultResearchBot/1.0 (+https://github.com/yyyuvvvraj/APIVault; read-only)"
MAX_BYTES, MAX_REDIRECTS, TIMEOUT = 1_500_000, 4, 12

class PageParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title, self.in_title, self.description, self.links = [], False, "", []
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag.lower() == "title": self.in_title = True
        if tag.lower() == "meta" and a.get("name", "").lower() in {"description", "og:description"}:
            self.description = a.get("content", "")[:500]
        if tag.lower() == "a" and a.get("href"): self.links.append({"href": a["href"], "text": ""})
    def handle_endtag(self, tag):
        if tag.lower() == "title": self.in_title = False
    def handle_data(self, data):
        if self.in_title: self.title.append(data)
        if self.links and not self.links[-1]["text"]: self.links[-1]["text"] = data.strip()[:180]

class SafeRedirect(HTTPRedirectHandler):
    def __init__(self): super().__init__(); self.count = 0
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        self.count += 1
        if self.count > MAX_REDIRECTS: raise URLError("redirect limit exceeded")
        validate_public_url(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)

def validate_public_url(url):
    p = urlparse(url)
    if p.scheme not in {"http", "https"} or not p.hostname or p.username or p.password:
        raise ValueError("only credential-free absolute HTTP(S) URLs are allowed")
    host = p.hostname.encode("idna").decode("ascii")
    addresses = {x[4][0] for x in socket.getaddrinfo(host, p.port or (443 if p.scheme == "https" else 80), type=socket.SOCK_STREAM)}
    if not addresses or any(not ipaddress.ip_address(x).is_global for x in addresses):
        raise ValueError("host does not resolve exclusively to globally routable addresses")

def hostname(url):
    try:
        p = urlparse(url)
        return p.hostname.lower().encode("idna").decode("ascii") if p.scheme in {"http", "https"} and p.hostname else None
    except Exception: return None

def link_kind(text, url):
    value = (text + " " + url).lower()
    for kind, pattern in [
        ("API_DOCUMENTATION", r"api[-_ ]?(docs?|reference)|developer|documentation|\bdocs?\b|openapi|swagger|redoc"),
        ("AUTHENTICATION", r"auth|oauth|api[-_ ]?key|token|security"),
        ("PRICING", r"pricing|plans|billing|cost"),
        ("TERMS", r"terms|acceptable[-_ ]use|legal|licen[cs]e"),
        ("STATUS", r"status|uptime|incident"),
        ("SUPPORT", r"support|contact|help|community")]:
        if re.search(pattern, value): return kind
    return None

def fetch_page(url):
    started = time.monotonic()
    out = {"requestedUrl": url, "fetchStatus": "FETCH_FAILED", "httpStatus": None,
           "resolvedUrl": None, "contentType": None, "title": "", "description": "",
           "candidateLinks": [], "error": None}
    try:
        validate_public_url(url)
        opener = build_opener(SafeRedirect())
        req = Request(url, headers={"User-Agent": USER_AGENT,
                    "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.1"}, method="GET")
        with opener.open(req, timeout=TIMEOUT) as response:
            body = response.read(MAX_BYTES + 1)
            if len(body) > MAX_BYTES: body = body[:MAX_BYTES]; out["truncated"] = True
            content_type = response.headers.get("Content-Type", "")
            out.update({"httpStatus": response.status, "resolvedUrl": response.geturl(), "contentType": content_type})
            if "html" in content_type.lower() or body.lstrip().lower().startswith((b"<!doctype html", b"<html")):
                parser = PageParser(); parser.feed(body.decode("utf-8", errors="replace"))
                out["title"] = " ".join(" ".join(parser.title).split())[:300]
                out["description"] = html.unescape(parser.description).strip()[:500]
                seen = set()
                for item in parser.links:
                    absolute = urljoin(response.geturl(), item["href"]); p = urlparse(absolute)
                    if p.scheme not in {"http", "https"} or not p.hostname: continue
                    absolute = urlunparse((p.scheme, p.netloc, p.path, "", p.query, ""))
                    kind = link_kind(item["text"], absolute)
                    if kind and absolute not in seen:
                        seen.add(absolute)
                        out["candidateLinks"].append({"kind": kind, "url": absolute,
                            "linkText": item["text"][:180], "evidenceStatus": "UNVERIFIED_CANDIDATE"})
                out["candidateLinks"] = out["candidateLinks"][:80]
            out["fetchStatus"] = "FETCHED"
    except HTTPError as exc: out.update({"httpStatus": exc.code, "error": f"HTTP_{exc.code}"})
    except Exception as exc: out["error"] = f"{type(exc).__name__}: {str(exc)[:180]}"
    out["elapsedMs"] = round((time.monotonic() - started) * 1000)
    out["observedAt"] = dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00", "Z")
    out["researchMethod"] = "single-page read-only HTTP reconnaissance; ownership and API claims not verified"
    return out

def research_candidate_pages(research, max_pages=8):
    """Fetch a bounded set of discovered evidence links; never treat them as verified."""
    if max_pages <= 0:
        research["followUpPages"] = []
        return research
    priority = {"API_DOCUMENTATION": 0, "AUTHENTICATION": 1, "TERMS": 2, "PRICING": 3, "STATUS": 4, "SUPPORT": 5}
    ordered = sorted(research.get("candidateLinks", []), key=lambda item: (priority.get(item.get("kind"), 99), item.get("url", "")))
    pages, seen = [], set()
    for link in ordered:
        url = link.get("url", "")
        if not url or url in seen: continue
        seen.add(url)
        result = fetch_with_retries(url)
        pages.append({"kind": link.get("kind", "UNKNOWN"), "url": url, "linkText": link.get("linkText", ""), "evidenceStatus": "UNVERIFIED_CANDIDATE", "fetchStatus": result.get("fetchStatus"), "httpStatus": result.get("httpStatus"), "resolvedUrl": result.get("resolvedUrl"), "contentType": result.get("contentType"), "title": result.get("title", ""), "description": result.get("description", ""), "error": result.get("error"), "attempts": result.get("attempts", 1), "observedAt": result.get("observedAt")})
        if len(pages) >= max(0, max_pages): break
    research["followUpPages"] = pages
    return research


def fetch_with_retries(url, attempts=3, base_delay=1.0):
    """Retry transient provider/network failures without retrying permanent HTTP errors."""
    retryable_http = {"HTTP_408", "HTTP_425", "HTTP_429", "HTTP_500", "HTTP_502", "HTTP_503", "HTTP_504"}
    result = None
    for attempt in range(1, max(1, attempts) + 1):
        result = fetch_page(url)
        result["attempts"] = attempt
        error = result.get("error") or ""
        transient_network = any(token in error for token in ("TimeoutError", "URLError", "ConnectionError", "Temporary failure"))
        if result.get("fetchStatus") == "FETCHED" or (error not in retryable_http and not transient_network) or attempt == attempts:
            return result
        time.sleep(base_delay * (2 ** (attempt - 1)))
    return result


def run(inputs, output, workers, max_pages_per_host=8):
    leads = []
    for path in inputs:
        with open(path, encoding="utf-8") as f:
            leads.extend(json.load(f).get("candidates", []))
    leads = list({x.get("reviewId"): x for x in leads}.values())
    if not leads: raise SystemExit("No discovery leads found")
    groups, invalid = defaultdict(list), []
    for lead in leads:
        url = lead.get("canonicalUrl") or lead.get("originalUrl") or ""
        host = hostname(url)
        if host: groups[host].append(lead)
        else: invalid.append(lead)
    def representative(group):
        urls = [x.get("canonicalUrl") or x.get("originalUrl") for x in group]
        return sorted(urls, key=lambda u: (not u.startswith("https://"), len(urlparse(u).path), len(u)))[0]
    results = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, min(workers, 20))) as pool:
        futures = {pool.submit(fetch_with_retries, representative(group)): host for host, group in groups.items()}
        for future in concurrent.futures.as_completed(futures): results[futures[future]] = future.result()
    records = []
    for lead in leads:
        url = lead.get("canonicalUrl") or lead.get("originalUrl") or ""; host = hostname(url)
        research = results.get(host)
        records.append({"reviewId": lead.get("reviewId"), "name": lead.get("name", ""),
            "priority": lead.get("priority", "NORMAL"), "sourceUrl": lead.get("originalUrl", ""), "canonicalUrl": lead.get("canonicalUrl", ""),
            "sourceCategory": lead.get("sourceCategory", ""), "suggestedCategory": lead.get("suggestedCategory", ""),
            "hostname": host, "research": research, "disposition": "HUMAN_REVIEW_REQUIRED",
            "providerIdentity": "UNCONFIRMED", "officialHomepage": "UNCONFIRMED",
            "apiDocumentation": "UNCONFIRMED", "authentication": "UNKNOWN", "pricing": "UNKNOWN",
            "termsAndLicense": "UNASSESSED", "importEligible": False, "verificationStatus": "UNVERIFIED",
            "publicationStatus": "NOT_PUBLISHED"} if host else {
            "reviewId": lead.get("reviewId"), "name": lead.get("name", ""), "priority": lead.get("priority", "NORMAL"),
            "sourceUrl": lead.get("originalUrl", ""), "disposition": "HUMAN_REVIEW_REQUIRED",
            "researchError": "invalid or unsupported source URL", "importEligible": False,
            "verificationStatus": "UNVERIFIED", "publicationStatus": "NOT_PUBLISHED"})
    for research in results.values(): research_candidate_pages(research, max_pages_per_host)
    fetched = sum(x["fetchStatus"] == "FETCHED" for x in results.values())
    status_counts = Counter(x["research"]["fetchStatus"] if x.get("research") else "INVALID_URL" for x in records)
    link_counts = Counter(link["kind"] for x in results.values() for link in x.get("candidateLinks", []))
    report = {"schemaVersion": "1", "generatedAt": dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00", "Z"),
        "researchScope": "all priority levels; one representative read-only fetch per unique hostname", "leadCount": len(records),
        "uniqueHostnames": len(groups), "hostFetchesSucceeded": fetched, "hostFetchesFailed": len(groups)-fetched,
        "followUpPagesAttempted": sum(len(x.get("followUpPages", [])) for x in results.values()),
        "followUpPagesFetched": sum(p.get("fetchStatus") == "FETCHED" for x in results.values() for p in x.get("followUpPages", [])),
        "leadFetchDispositionCounts": dict(status_counts), "candidateLinkCounts": dict(link_counts),
        "policy": "Automated findings are leads for human review only. Candidate links are not authenticated or endorsed. No approval, import, verification, database write, or publication is performed.",
        "records": sorted(records, key=lambda x: x.get("reviewId", ""))}
    os.makedirs(os.path.dirname(output) or ".", exist_ok=True)
    with open(output, "w", encoding="utf-8") as f: json.dump(report, f, indent=2, ensure_ascii=False); f.write("\n")
    return {k:v for k,v in report.items() if k != "records"}

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--input", action="append", required=True); p.add_argument("--output", required=True)
    p.add_argument("--workers", type=int, default=12)
    p.add_argument("--max-pages-per-host", type=int, default=8)
    a = p.parse_args()
    print(json.dumps(run(a.input, a.output, a.workers, max(0, min(a.max_pages_per_host, 24))), indent=2))
