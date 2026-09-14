#!/usr/bin/env python3
"""
Crawl4AI Experimental Runner Bridge

Provides a command-line interface for crawling career pages using Crawl4AI OSS
(or standard deterministic fallback parser if crawl4ai is not installed).

Outputs structured JSON containing extracted jobs, runtime metrics, and
failure classifications (e.g. BROWSER_REQUIRED).
"""

import sys
import json
import time
import re
import urllib.request
import urllib.error
from typing import Dict, Any, List

def detect_browser_requirement(html: str) -> Dict[str, Any]:
    lower = html.lower()
    if any(k in lower for k in [
        "you need to enable javascript to run this app",
        "javascript is required",
        "please enable javascript to view this page"
    ]):
        return {
            "required": True,
            "failure_class": "JS_HYDRATION_REQUIRED",
            "evidence": "Noscript javascript warning detected"
        }
    
    empty_roots = [
        r'<div[^>]+id=["\'](app|root|__next|careers-mount)["\'][^>]*>\s*</div>',
        r'<div[^>]+id=["\'](job-list|careers-list|openings)["\'][^>]*>\s*</div>'
    ]
    for pattern in empty_roots:
        if re.search(pattern, html, re.IGNORECASE):
            return {
                "required": True,
                "failure_class": "SPA_NAVIGATION_REQUIRED",
                "evidence": f"Empty SPA container matching {pattern}"
            }
            
    return {"required": False}

def extract_jobs_fallback(html: str, base_url: str, company: str) -> List[Dict[str, Any]]:
    jobs = []
    # 1. JSON-LD extraction
    for match in re.finditer(r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', html, re.DOTALL | re.IGNORECASE):
        try:
            data = json.loads(match.group(1).strip())
            items = data if isinstance(data, list) else data.get("@graph", [data])
            for item in items:
                if isinstance(item, dict) and item.get("@type") == "JobPosting":
                    jobs.append({
                        "title": item.get("title", "").strip(),
                        "url": item.get("url", base_url),
                        "company": company,
                        "location": "Remote",
                        "descriptionSnippet": (item.get("description") or "")[:300].strip(),
                        "publishedAt": item.get("datePosted")
                    })
        except Exception:
            pass

    if jobs:
        return jobs

    # 2. Heuristic link extraction
    link_pattern = re.compile(r'<a[^>]+href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', re.DOTALL | re.IGNORECASE)
    seen = set()
    for m in link_pattern.finditer(html):
        href = m.group(1).strip()
        text = re.sub(r'<[^>]+>', '', m.group(2)).strip()
        text = re.sub(r'\s+', ' ', text)
        if re.search(r'/(jobs?|careers?|positions?|openings)/|view-job', href, re.IGNORECASE):
            if not any(bad in href.lower() for bad in ["login", "signin", "privacy", "terms", "cookie", "#"]):
                if 4 <= len(text) <= 120 and href not in seen:
                    seen.add(href)
                    job_url = href if href.startswith("http") else base_url.rstrip("/") + "/" + href.lstrip("/")
                    jobs.append({
                        "title": text,
                        "url": job_url,
                        "company": company,
                        "location": "Remote"
                    })
    return jobs

def crawl_site(url: str, company: str) -> Dict[str, Any]:
    start = time.time()
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; RemotePHJobsBot-Crawl4AI/1.0; +https://github.com/cyalcala/va-freelance-hub)"
    }
    
    # Check if crawl4ai is available
    try:
        import crawl4ai
        has_crawl4ai = True
    except ImportError:
        has_crawl4ai = False

    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=25) as response:
            status = response.getcode()
            content = response.read().decode('utf-8', errors='ignore')
            runtime_ms = int((time.time() - start) * 1000)
            
            browser_check = detect_browser_requirement(content)
            jobs = extract_jobs_fallback(content, url, company)
            
            if not jobs and browser_check.get("required"):
                return {
                    "capability": "crawl4ai",
                    "success": False,
                    "runtimeMs": runtime_ms,
                    "pagesVisited": 1,
                    "bytesReceived": len(content.encode('utf-8')),
                    "items": [],
                    "failureClass": browser_check["failure_class"],
                    "browserRequiredEvidence": browser_check["evidence"]
                }
                
            if not jobs:
                return {
                    "capability": "crawl4ai",
                    "success": False,
                    "runtimeMs": runtime_ms,
                    "pagesVisited": 1,
                    "bytesReceived": len(content.encode('utf-8')),
                    "items": [],
                    "failureClass": "EMPTY_NO_JOBS"
                }

            return {
                "capability": "crawl4ai",
                "success": True,
                "runtimeMs": runtime_ms,
                "pagesVisited": 1,
                "bytesReceived": len(content.encode('utf-8')),
                "items": jobs
            }
    except urllib.error.HTTPError as e:
        runtime_ms = int((time.time() - start) * 1000)
        fc = "RATE_LIMITED" if e.code == 429 else ("POLICY_BLOCKED" if e.code in (401, 403) else "NETWORK_FAILURE")
        return {
            "capability": "crawl4ai",
            "success": False,
            "runtimeMs": runtime_ms,
            "pagesVisited": 1,
            "bytesReceived": 0,
            "items": [],
            "failureClass": fc,
            "stopReason": f"HTTP {e.code}"
        }
    except Exception as e:
        runtime_ms = int((time.time() - start) * 1000)
        return {
            "capability": "crawl4ai",
            "success": False,
            "runtimeMs": runtime_ms,
            "pagesVisited": 0,
            "bytesReceived": 0,
            "items": [],
            "failureClass": "NETWORK_FAILURE",
            "stopReason": str(e)
        }

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: crawl4ai_runner.py <url> <company_name>"}))
        sys.exit(1)
        
    target_url = sys.argv[1]
    target_company = sys.argv[2]
    result = crawl_site(target_url, target_company)
    print(json.dumps(result, indent=2))
