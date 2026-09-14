import unittest
import json
from scripts.experiments.crawl4ai_runner import detect_browser_requirement, extract_jobs_fallback

class TestCrawl4AiRunner(unittest.TestCase):
    def test_detect_browser_requirement_noscript(self):
        html = "<html><body><noscript>You need to enable JavaScript to run this app.</noscript></body></html>"
        res = detect_browser_requirement(html)
        self.assertTrue(res["required"])
        self.assertEqual(res["failure_class"], "JS_HYDRATION_REQUIRED")

    def test_detect_browser_requirement_spa_root(self):
        html = '<html><body><div id="root"></div></body></html>'
        res = detect_browser_requirement(html)
        self.assertTrue(res["required"])
        self.assertEqual(res["failure_class"], "SPA_NAVIGATION_REQUIRED")

    def test_extract_jobs_json_ld(self):
        html = '''
        <html><head>
        <script type="application/ld+json">
        {
            "@type": "JobPosting",
            "title": "Virtual Assistant",
            "url": "https://example.com/job/1",
            "description": "Remote VA position"
        }
        </script>
        </head></html>
        '''
        jobs = extract_jobs_fallback(html, "https://example.com", "ExampleCo")
        self.assertEqual(len(jobs), 1)
        self.assertEqual(jobs[0]["title"], "Virtual Assistant")
        self.assertEqual(jobs[0]["url"], "https://example.com/job/1")

if __name__ == "__main__":
    unittest.main()
