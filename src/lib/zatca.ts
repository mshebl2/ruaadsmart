export function generateZatcaTLV(
  sellerName: string,
  vatNumber: string,
  timestamp: string,
  totalAmount: string,
  vatAmount: string
): string {
  try {
    const encoder = new TextEncoder();

    const getTagValueBytes = (tag: number, value: string): Uint8Array => {
      const valueBytes = encoder.encode(value);
      const tagLengthBytes = new Uint8Array(2 + valueBytes.length);
      tagLengthBytes[0] = tag;
      tagLengthBytes[1] = valueBytes.length;
      tagLengthBytes.set(valueBytes, 2);
      return tagLengthBytes;
    };

    const tag1 = getTagValueBytes(1, sellerName || "Supplier");
    const tag2 = getTagValueBytes(2, vatNumber || "000000000000000");
    const tag3 = getTagValueBytes(3, timestamp || new Date().toISOString());
    const tag4 = getTagValueBytes(4, String(totalAmount) || "0.00");
    const tag5 = getTagValueBytes(5, String(vatAmount) || "0.00");

    // Combine all tag byte arrays
    const totalLength = tag1.length + tag2.length + tag3.length + tag4.length + tag5.length;
    const tlvBytes = new Uint8Array(totalLength);
    
    let offset = 0;
    [tag1, tag2, tag3, tag4, tag5].forEach((tagBytes) => {
      tlvBytes.set(tagBytes, offset);
      offset += tagBytes.length;
    });

    // Convert bytes to base64 safely across Node and Browser environments
    let binaryString = "";
    for (let i = 0; i < tlvBytes.length; i++) {
      binaryString += String.fromCharCode(tlvBytes[i]);
    }
    return btoa(binaryString);
  } catch (error) {
    console.error("ZATCA TLV Generation Error:", error);
    return "";
  }
}
