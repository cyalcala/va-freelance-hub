export function categorizeOpportunityTitle(title: string, description: string = ""): string {
  const lower = `${title} ${description}`.toLowerCase();

  // Tech / Engineering
  if (
    lower.includes("software") ||
    lower.includes("developer") ||
    lower.includes("engineer") ||
    lower.includes("architect") ||
    lower.includes("bim technician") ||
    lower.includes("civil designer") ||
    lower.includes("devops") ||
    lower.includes("qa ") ||
    lower.includes("quality assurance") ||
    lower.includes("scrum master") ||
    lower.includes("programmer") ||
    lower.includes("full stack") ||
    lower.includes("backend") ||
    lower.includes("frontend")
  ) {
    return "tech";
  }

  // Finance & Accounting
  if (
    lower.includes("accountant") ||
    lower.includes("bookkeep") ||
    lower.includes("accounts receivable") ||
    lower.includes("accounts payable") ||
    lower.includes("financial") ||
    lower.includes("billing") ||
    lower.includes("payroll") ||
    lower.includes("tax ") ||
    lower.includes("audit") ||
    lower.includes("cpa") ||
    lower.includes("invoicing")
  ) {
    return "finance";
  }

  // Design & Creative
  if (
    lower.includes("video edit") ||
    lower.includes("graphic design") ||
    lower.includes("creative designer") ||
    lower.includes("ui/ux") ||
    lower.includes("illustrat") ||
    lower.includes("animat") ||
    lower.includes("photoshop") ||
    lower.includes("canva")
  ) {
    return "design";
  }

  // Customer Service & Support
  if (
    lower.includes("customer service") ||
    lower.includes("customer support") ||
    lower.includes("client success") ||
    lower.includes("helpdesk") ||
    lower.includes("technical support") ||
    lower.includes("caller") ||
    lower.includes("inbound") ||
    lower.includes("chat support") ||
    lower.includes("csr") ||
    lower.includes("call center") ||
    lower.includes("patient engagement") ||
    lower.includes("patient care") ||
    lower.includes("customer care")
  ) {
    return "customer-service";
  }

  // Marketing & Sales
  if (
    lower.includes("marketing") ||
    lower.includes("social media") ||
    lower.includes("sales development") ||
    lower.includes("sales representative") ||
    lower.includes("lead generation") ||
    lower.includes("b2b") ||
    lower.includes("growth") ||
    lower.includes("seo") ||
    lower.includes("ppc") ||
    lower.includes("outbound") ||
    lower.includes("campaign") ||
    lower.includes("crm") ||
    lower.includes("telemarket") ||
    lower.includes("appointment setter") ||
    lower.includes("sourcing") ||
    lower.includes("product sourcing") ||
    lower.includes("fba") ||
    lower.includes("arbitrage")
  ) {
    return "marketing";
  }

  // Writing & Content
  if (
    lower.includes("writer") ||
    lower.includes("copywriter") ||
    lower.includes("content writer") ||
    lower.includes("proofread") ||
    lower.includes("editor") ||
    lower.includes("content specialist")
  ) {
    return "writing";
  }

  // Admin & Operations & General VA
  if (
    lower.includes("virtual assistant") ||
    lower.includes("va") ||
    lower.includes("administrative") ||
    lower.includes("admin") ||
    lower.includes("operations") ||
    lower.includes("executive assistant") ||
    lower.includes("personal assistant") ||
    lower.includes("scheduling") ||
    lower.includes("coordination") ||
    lower.includes("project management") ||
    lower.includes("recruiting") ||
    lower.includes("candidate coordination") ||
    lower.includes("intake") ||
    lower.includes("clerk") ||
    lower.includes("data entry") ||
    lower.includes("office") ||
    lower.includes("logistics") ||
    lower.includes("freight") ||
    lower.includes("brokerage") ||
    lower.includes("insurance")
  ) {
    return "admin";
  }

  return "other";
}
