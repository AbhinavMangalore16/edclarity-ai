/**
 * Extracts plain text content from a PDF Buffer or Base64 string.
 * Compatible with Next.js Turbopack ESM and Node.js Runtimes.
 */
export async function parsePdfContent(input: Buffer | string): Promise<string> {
  try {
    let buffer: Buffer;
    if (typeof input === "string") {
      // Remove base64 data prefix if present
      const base64Data = input.replace(/^data:application\/pdf;base64,/, "");
      buffer = Buffer.from(base64Data, "base64");
    } else {
      buffer = input;
    }

    // Dynamic import supporting Turbopack ESM exports ({ PDFParse } vs default)
    const pdfModule: any = await import("pdf-parse");
    const parseFn = pdfModule.PDFParse || pdfModule.default || pdfModule;

    let data: any;
    if (typeof parseFn === "function") {
      data = await parseFn(buffer);
    } else if (typeof parseFn?.parse === "function") {
      data = await parseFn.parse(buffer);
    } else {
      throw new Error("Invalid PDF parser module export signature");
    }

    const cleanedText = (data?.text || "")
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return cleanedText;
  } catch (error: any) {
    console.error("[PDF PARSER ERROR]:", error?.message || error);
    throw new Error(`Failed to parse PDF document: ${error?.message || "Unknown error"}`);
  }
}
