# Job Taxonomy & Role Family Coverage (Pillar G)

Standardized job taxonomy and classification specifications for VA Freelance Hub.

---

## 1. Product Positioning & Strategy

VA Freelance Hub is a high-yield, Philippines-centered remote job discovery engine. While virtual assistance and remote operations remain core pillars, the platform actively covers modern digital knowledge work where Filipino talent excels globally.

The system rejects brittle keyword title matching in favor of standardized **Role Families** governed by strict taxonomy validation.

---

## 2. Standardized Role Families & Slugs

All opportunities are classified into exactly one of nine canonical board categories:

| Category Slug | Display Name | Included Role Specializations | Typical Tools / Skills |
| :--- | :--- | :--- | :--- |
| `admin` | Virtual & Executive Assistance | Virtual assistant, executive assistant, data entry, calendar/inbox management, travel coordination, office operations, recruitment coordinator. | Google Workspace, Notion, Asana, ClickUp, Calendly, Excel |
| `writing` | Writing & Knowledge Management | Technical writer, documentation specialist, knowledge base manager, copywriter, content writer, editor, researcher, wiki curator. | Markdown, Confluence, Notion, Git, WordPress, SEO tools |
| `ai` | AI Operations & Applied AI | AI operations specialist, prompt engineer, LLM evaluation, AI workflow builder, machine learning engineer, data annotator / reviewer. | LangChain, OpenAI API, Python, Claude, Zapier, Make |
| `customer-service` | Customer Support & Success | Customer support agent, chat/email support, helpdesk technician, ticketing specialist, client success representative. | Zendesk, Freshdesk, Intercom, Salesforce, Gorgias |
| `design` | Design & Creative | Graphic designer, UI/UX designer, video editor, motion graphics artist, brand designer, presentation designer, illustrator. | Figma, Adobe Premiere, Canva, Photoshop, After Effects |
| `tech` | Software & Technical Support | Fullstack/frontend/backend developer, QA engineer, devops specialist, IT support technician, systems administrator. | JavaScript, TypeScript, React, Node.js, AWS, Docker |
| `marketing` | Marketing & Social Media | Social media manager, digital marketing coordinator, SEO specialist, email marketer, media buyer, growth coordinator. | Meta Business Suite, Canva, HubSpot, Mailchimp, GA4 |
| `finance` | Finance & Bookkeeping | Bookkeeper, accounts payable/receivable clerk, financial analyst, payroll assistant, tax preparation assistant. | QuickBooks, Xero, Wave, NetSuite, Advanced Excel |
| `other` | General Remote Roles | Cross-functional or specialized roles that do not cleanly fit into the specific families above. | General office & communication tools |

---

## 3. Strict Anti-Drift & Coercion Rules (DATA-06)

To prevent LLM hallucinations from creating arbitrary categories (e.g. `healthcare`, `teaching`, `sales`, `nursing`) or using non-standard aliases (e.g. `creative`, `social-media`, `customer-support`):
1. **Alias Normalization**: `technical-writing`, `copywriting`, `content-production`, and `knowledge-management` are automatically mapped to `writing`.
2. **Whitelist Coercion**: Any unmapped category is strictly coerced to `other` prior to saving in Cloudflare D1.
3. **Single Source of Truth**: All UI routes, the scrape route, and the Inngest drain consume the shared mapper `mapTriageCategoryToUiCategory()` from `packages/scraper/triage-decision.ts`.
