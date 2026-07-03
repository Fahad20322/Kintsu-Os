export type Intent =
  | "PRODUCT_AVAILABILITY"
  | "SALES_SUMMARY"
  | "CUSTOMER_HISTORY"
  | "RESTOCK_SUGGESTIONS"
  | "BRIDAL_STATUS"
  | "UNKNOWN";

export type ParsedQuery = {
  intent: Intent;
  phone?: string;
  searchTerm?: string;
  period?: "today" | "week" | "month";
};

const PHONE_REGEX = /\b\d{10}\b/;

function extractSearchTerm(query: string, stripWords: string[]): string | undefined {
  let cleaned = query.toLowerCase();
  for (const word of stripWords) {
    cleaned = cleaned.replace(new RegExp(`\\b${word}\\b`, "gi"), "");
  }
  cleaned = cleaned.replace(/[?.!]/g, "").trim().replace(/\s+/g, " ");
  return cleaned.length > 1 ? cleaned : undefined;
}

/**
 * Rule-based intent classification — deliberately simple keyword/regex
 * matching rather than an LLM call (no API key is configured in this
 * environment). Returns UNKNOWN rather than guessing when nothing matches,
 * since a wrong structured-search answer is worse than an honest "I don't
 * understand".
 */
export function parseQuery(rawQuery: string): ParsedQuery {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return { intent: "UNKNOWN" };

  const phoneMatch = rawQuery.match(PHONE_REGEX);

  if (/\b(bridal|bride|groom|wedding)\b/.test(query)) {
    return {
      intent: "BRIDAL_STATUS",
      phone: phoneMatch?.[0],
      searchTerm: extractSearchTerm(rawQuery, [
        "bridal",
        "bride",
        "groom",
        "wedding",
        "status",
        "for",
        "of",
        "show",
        "what",
        "is",
        "the",
      ]),
    };
  }

  if (phoneMatch || /\b(customer|purchase history|spent|spend|bought)\b/.test(query)) {
    return {
      intent: "CUSTOMER_HISTORY",
      phone: phoneMatch?.[0],
      searchTerm: extractSearchTerm(rawQuery, [
        "customer",
        "history",
        "for",
        "show",
        "what",
        "has",
        "bought",
        "purchase",
        "purchases",
      ]),
    };
  }

  if (/\b(restock\w*|reorder\w*|running out|need to order|low on)\b/.test(query)) {
    return { intent: "RESTOCK_SUGGESTIONS" };
  }

  if (/\b(sales|revenue|sold|how much did we sell|earnings)\b/.test(query)) {
    let period: ParsedQuery["period"] = "today";
    if (/\b(week|weekly)\b/.test(query)) period = "week";
    if (/\b(month|monthly)\b/.test(query)) period = "month";
    return { intent: "SALES_SUMMARY", period };
  }

  if (/\b(stock|available|availability|in stock|do we have|inventory)\b/.test(query)) {
    return {
      intent: "PRODUCT_AVAILABILITY",
      searchTerm: extractSearchTerm(rawQuery, [
        "how",
        "many",
        "do",
        "we",
        "have",
        "in",
        "stock",
        "available",
        "availability",
        "inventory",
        "of",
        "left",
      ]),
    };
  }

  return { intent: "UNKNOWN" };
}
