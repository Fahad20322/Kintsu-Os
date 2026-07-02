import bwipjs from "bwip-js/node";

/**
 * Generates a Code128 barcode as a PNG buffer for a given value.
 */
export async function generateBarcodePng(value: string): Promise<Buffer> {
  return bwipjs.toBuffer({
    bcid: "code128",
    text: value,
    scale: 3,
    height: 12,
    includetext: true,
    textxalign: "center",
  });
}

/** Deterministic-looking but unique barcode value: prefix + timestamp base36 + random. */
export function generateBarcodeValue(prefix = "KOS"): string {
  const time = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}${time}${rand}`;
}

/** SKU derived from article code + size + color, e.g. LEH-2201-M-RED */
export function generateSku(articleCode: string, size: string, color: string): string {
  const clean = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]+/g, "");
  return `${clean(articleCode)}-${clean(size)}-${clean(color)}`;
}

export function generateArticleCode(categoryPrefix: string, sequence: number): string {
  const clean = categoryPrefix.toUpperCase().replace(/[^A-Z0-9]+/g, "").slice(0, 4);
  return `${clean || "ART"}-${String(sequence).padStart(5, "0")}`;
}
