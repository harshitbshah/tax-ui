/**
 * Indian income tax portal wraps PDFs in Java serialization (magic bytes: aced0005).
 * This extracts the embedded PDF bytes when that wrapper is detected.
 */
export function unwrapIfJavaSerialized(buf: Buffer): Buffer {
  if (buf[0] === 0xac && buf[1] === 0xed) {
    const pdfStart = buf.indexOf(Buffer.from("%PDF"));
    const pdfEnd = buf.lastIndexOf(Buffer.from("%%EOF")) + 5;
    if (pdfStart >= 0 && pdfEnd > pdfStart) {
      return buf.subarray(pdfStart, pdfEnd);
    }
  }
  return buf;
}
