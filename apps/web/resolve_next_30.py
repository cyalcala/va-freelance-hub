import json
import os
import re
import time
import requests
import urllib.parse
from bs4 import BeautifulSoup

unresolved_path = r"c:\Users\admin\Desktop\va-freelance-hub\apps\web\unresolved_current.json"
resolve_state_path = r"c:\Users\admin\Desktop\va-freelance-hub\apps\web\resolve_state.json"
sql_output_path = r"c:\Users\admin\Desktop\va-freelance-hub\apps\web\ats_updates.sql"

def clean_url(href):
    if not href:
        return None
    if href.startswith('//'):
        href = 'https:' + href
    if 'duckduckgo.com/l/?uddg=' in href:
        parsed = urllib.parse.urlparse(href)
        qs = urllib.parse.parse_qs(parsed.query)
        if 'uddg' in qs:
            return qs['uddg'][0]
    return href

def ddg_search(query):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
    }
    url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(query)}"
    try:
        r = requests.get(url, headers=headers, timeout=10)
        if r.status_code != 200:
            print(f"    DDG search HTTP {r.status_code} for query: {query}")
            return []
        soup = BeautifulSoup(r.text, 'html.parser')
        results = []
        for a in soup.find_all('a', class_='result__snippet'):
            parent = a.find_parent('div', class_='result__body')
            if parent:
                title_a = parent.find('a', class_='result__url')
                if title_a:
                    href = clean_url(title_a['href'])
                    results.append({
                        'title': title_a.text.strip(),
                        'href': href,
                        'body': a.text.strip()
                    })
        return results
    except Exception as e:
        print(f"    Error during DDG search: {e}")
        return []

def extract_ats(url):
    if not url:
        return None, None
    
    # Check lever
    # jobs.lever.co/<slug>
    lever_match = re.search(r'jobs\.lever\.co/([^/\?\s]+)', url)
    if lever_match:
        token = lever_match.group(1)
        # Some URLs look like jobs.lever.co/company-name/job-id, we only want the company name slug
        if token == 'v' or token == 'embed':
            # handle jobs.lever.co/v/slug or jobs.lever.co/embed/slug
            match2 = re.search(r'jobs\.lever\.co/(?:v|embed)/([^/\?\s]+)', url)
            if match2:
                return 'lever', match2.group(1)
        return 'lever', token
        
    # Check greenhouse
    # boards.greenhouse.io/<slug> or boards-api.greenhouse.io/v1/boards/<slug>
    greenhouse_match = re.search(r'boards\.greenhouse\.io/([^/\?\s]+)', url)
    if greenhouse_match:
        token = greenhouse_match.group(1)
        if token == 'embed' or token == 'v1':
            match2 = re.search(r'boards\.greenhouse\.io/(?:embed|v1/boards)/([^/\?\s]+)', url)
            if match2:
                return 'greenhouse', match2.group(1)
        return 'greenhouse', token
        
    # Check workable
    # apply.workable.com/<slug> or <slug>.workable.com or jobs.workable.com/company/<id>/jobs-at-<slug>
    workable_match1 = re.search(r'apply\.workable\.com/([^/\?\s]+)', url)
    if workable_match1:
        return 'workable', workable_match1.group(1)
        
    workable_match2 = re.search(r'([^/\?\.\s]+)\.workable\.com', url)
    if workable_match2 and workable_match2.group(1) not in ('www', 'apply', 'jobs', 'assets', 'api'):
        return 'workable', workable_match2.group(1)

    workable_match3 = re.search(r'jobs\.workable\.com/company/[^/]+/jobs-at-([^/\?\s]+)', url)
    if workable_match3:
        return 'workable', workable_match3.group(1)
        
    # Check breezy
    # <slug>.breezy.hr
    breezy_match = re.search(r'([^/\?\.\s]+)\.breezy\.hr', url)
    if breezy_match and breezy_match.group(1) not in ('www', 'apply', 'jobs', 'api'):
        return 'breezy', breezy_match.group(1)
        
    return None, None

def scrape_page_for_ats(url):
    if not url:
        return None, None, None
    
    if not url.startswith('http'):
        url = 'https://' + url
        
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
    }
    
    try:
        # print(f"    Scraping URL: {url}")
        r = requests.get(url, headers=headers, timeout=10, allow_redirects=True)
        # Check if the redirected URL matches ATS
        platform, token = extract_ats(r.url)
        if platform:
            return platform, token, r.url
            
        soup = BeautifulSoup(r.text, 'html.parser')
        
        # Check all links
        for a in soup.find_all('a', href=True):
            href = a['href']
            platform, token = extract_ats(href)
            if platform:
                return platform, token, href
                
        # Check scripts/iframes
        for iframe in soup.find_all('iframe', src=True):
            src = iframe['src']
            platform, token = extract_ats(src)
            if platform:
                return platform, token, src
                
        for script in soup.find_all('script', src=True):
            src = script['src']
            platform, token = extract_ats(src)
            if platform:
                return platform, token, src
                
    except Exception as e:
        pass
        
    return None, None, None

def find_career_links(home_url, html_content):
    soup = BeautifulSoup(html_content, 'html.parser')
    candidates = []
    for a in soup.find_all('a', href=True):
        href = a['href'].lower()
        text = a.text.lower()
        if 'career' in href or 'job' in href or 'join' in href or 'work-with' in href or 'career' in text or 'job' in text or 'join' in text or 'work with' in text:
            full_url = urllib.parse.urljoin(home_url, a['href'])
            if full_url.startswith(home_url) or full_url.startswith('https://') or full_url.startswith('http://'):
                if full_url not in candidates:
                    candidates.append(full_url)
    return candidates

def process_company(company):
    name = company["company_name"]
    website = company["website"]
    print(f"\nProcessing company: {name} (URL: {website})")
    
    # Step 1: DDG Search for careers page matching ATS
    queries = [
        f"{name} careers",
        f"{name} jobs",
        f"{name} lever OR greenhouse OR workable OR breezy"
    ]
    
    # Try searching DDG first
    for query in queries:
        time.sleep(1) # sleep to avoid DDG limits
        search_results = ddg_search(query)
        for res in search_results:
            url = res['href']
            platform, token = extract_ats(url)
            if platform:
                print(f"  [FOUND] ATS platform '{platform}' and token '{token}' directly in search result: {url}")
                return platform, token, url

    # Step 2: Try to visit the home page and scrape
    if website:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
        }
        try:
            r = requests.get(website, headers=headers, timeout=10, allow_redirects=True)
            # Scan main page
            platform, token, source = scrape_page_for_ats(website)
            if platform:
                print(f"  [FOUND] ATS platform '{platform}' and token '{token}' in home page: {source}")
                return platform, token, source
            
            # Find and scan career pages
            career_links = find_career_links(website, r.text)
            for career_link in career_links[:3]: # check first 3 links
                platform, token, source = scrape_page_for_ats(career_link)
                if platform:
                    print(f"  [FOUND] ATS platform '{platform}' and token '{token}' in career page link {career_link}: {source}")
                    return platform, token, source
        except Exception as e:
            # print(f"  Error accessing website {website}: {e}")
            pass
            
    print("  [NOT FOUND] No ATS platform identified.")
    return "none", None, website

def main():
    # Load unresolved
    with open(unresolved_path, 'r', encoding='utf-8-sig') as f:
        unresolved_data = json.load(f)
    results = unresolved_data[0]["results"]
    
    # Load state
    if os.path.exists(resolve_state_path):
        with open(resolve_state_path, 'r', encoding='utf-8-sig') as f:
            resolve_state = json.load(f)
    else:
        resolve_state = {}
        
    # Get pending
    pending = []
    for company in results:
        company_id = str(company["id"])
        if company_id not in resolve_state:
            pending.append(company)
            
    batch = pending[:30]
    print(f"Total pending: {len(pending)}. Processing batch of {len(batch)} companies.")
    
    resolved_count = 0
    ats_found_count = 0
    
    for company in batch:
        cid = str(company["id"])
        platform, token, source_url = process_company(company)
        
        # Save to state
        resolve_state[cid] = {
            "company_name": company["company_name"],
            "platform": platform,
            "token": token,
            "sourceUrl": source_url,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }
        
        resolved_count += 1
        if platform != "none":
            ats_found_count += 1
            
        # Write state to file immediately
        with open(resolve_state_path, 'w', encoding='utf-8') as f:
            json.dump(resolve_state, f, indent=2)
            
    # Generate SQL file
    generate_sql_updates(resolve_state)
    print(f"\nDone! Resolved {resolved_count} companies. Found ATS for {ats_found_count} of them.")

def generate_sql_updates(state):
    sql_commands = []
    found_count = 0
    for cid, record in state.items():
        if record.get("platform") and record.get("platform") != "none" and record.get("token"):
            escaped_token = record["token"].replace("'", "''")
            # We also verify the record belongs to the batch of 30 or we can output for all known resolved ones.
            # But wait, does SQL update run correctly? Yes, we can just regenerate updates for all resolved in state
            # or only updates generated during this run. To be safe, let's write all found in state to keep it comprehensive.
            sql_commands.append(f"UPDATE va_directory SET ats_platform = '{record['platform']}', ats_token = '{escaped_token}' WHERE id = {cid};")
            found_count += 1
            
    with open(sql_output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(sql_commands))
    print(f"Wrote {found_count} SQL updates to {sql_output_path}")

if __name__ == "__main__":
    main()
