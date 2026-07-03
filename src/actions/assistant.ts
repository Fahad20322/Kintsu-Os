"use server";

import { requirePermission } from "@/lib/session";
import { parseQuery } from "@/lib/ai/intent-parser";
import {
  handleBridalStatus,
  handleCustomerHistory,
  handleProductAvailability,
  handleRestockSuggestions,
  handleSalesSummary,
  type HandlerResult,
} from "@/lib/ai/handlers";

const HELP_MESSAGE =
  "I can answer questions about: product availability (\"Do we have Rani Pink Lehenga in stock?\"), " +
  "sales summaries (\"What were today's sales?\"), customer history (\"Show history for 9876543210\"), " +
  "restock suggestions (\"What needs restocking?\"), and bridal order status (\"What's the status of Ananya's bridal order?\").";

export async function askAssistant(query: string): Promise<{
  intent: string;
  answer: string;
  data?: Record<string, unknown>[];
}> {
  const user = await requirePermission("assistant:use");
  if (!user.storeId) {
    return { intent: "UNKNOWN", answer: "No store associated with this account." };
  }

  const parsed = parseQuery(query);
  let result: HandlerResult;

  switch (parsed.intent) {
    case "PRODUCT_AVAILABILITY":
      result = await handleProductAvailability(parsed, user.storeId);
      break;
    case "SALES_SUMMARY":
      result = await handleSalesSummary(parsed, user.storeId);
      break;
    case "CUSTOMER_HISTORY":
      result = await handleCustomerHistory(parsed);
      break;
    case "RESTOCK_SUGGESTIONS":
      result = await handleRestockSuggestions(user.storeId);
      break;
    case "BRIDAL_STATUS":
      result = await handleBridalStatus(parsed, user.storeId);
      break;
    default:
      result = { answer: HELP_MESSAGE };
  }

  return { intent: parsed.intent, ...result };
}
