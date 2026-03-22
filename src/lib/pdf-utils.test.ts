import { describe, expect, test } from "bun:test";

import { unwrapIfJavaSerialized } from "./pdf-utils";

function makeJavaWrappedPdf(pdfContent: Buffer): Buffer {
  // Simulate the Indian IT portal format: Java serialization header + PDF bytes
  const javaHeader = Buffer.from([0xac, 0xed, 0x00, 0x05, 0x00, 0x00]);
  return Buffer.concat([javaHeader, pdfContent]);
}

describe("unwrapIfJavaSerialized", () => {
  test("returns real PDF buffer unchanged", () => {
    const pdf = Buffer.from("%PDF-1.4 content %%EOF");
    expect(unwrapIfJavaSerialized(pdf)).toBe(pdf);
  });

  test("extracts PDF from Java-serialized wrapper", () => {
    const pdfContent = Buffer.from("%PDF-1.4 real content %%EOF");
    const wrapped = makeJavaWrappedPdf(pdfContent);
    const result = unwrapIfJavaSerialized(wrapped);
    expect(result.toString()).toBe(pdfContent.toString());
  });

  test("returns buffer unchanged if Java magic present but no embedded PDF", () => {
    const notAPdf = Buffer.from([0xac, 0xed, 0x00, 0x05, 0x01, 0x02, 0x03]);
    const result = unwrapIfJavaSerialized(notAPdf);
    expect(result).toBe(notAPdf);
  });

  test("handles buffer with data after %%EOF", () => {
    const pdfContent = Buffer.from("%PDF-1.4 content %%EOF trailing garbage");
    const wrapped = makeJavaWrappedPdf(pdfContent);
    const result = unwrapIfJavaSerialized(wrapped);
    // Should end at %%EOF + 5 chars
    expect(result.toString().startsWith("%PDF")).toBe(true);
    expect(result.toString().includes("%%EOF")).toBe(true);
  });
});
