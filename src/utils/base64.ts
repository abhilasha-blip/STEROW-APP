/* eslint-disable no-bitwise -- base64 packs 3 bytes into 4 sextets */
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Standard base64 (with padding) of raw bytes; no dependency on btoa / Buffer (Hermes, Jest). */
export function bytesToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const out: string[] = [];
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out.push(ALPHABET[(n >> 18) & 63], ALPHABET[(n >> 12) & 63], ALPHABET[(n >> 6) & 63], ALPHABET[n & 63]);
  }
  const rest = bytes.length - i;
  if (rest === 1) {
    const n = bytes[i] << 16;
    out.push(ALPHABET[(n >> 18) & 63], ALPHABET[(n >> 12) & 63], '==');
  } else if (rest === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out.push(ALPHABET[(n >> 18) & 63], ALPHABET[(n >> 12) & 63], ALPHABET[(n >> 6) & 63], '=');
  }
  return out.join('');
}

/** "data:<mime>;base64,<…>": the image format the OCR routes take (as the web's FileReader.readAsDataURL). */
export const toDataUrl = (mimeType: string, bytes: ArrayBuffer | Uint8Array) =>
  `data:${mimeType};base64,${bytesToBase64(bytes)}`;
