// Re-export pako helpers with a stable local path so browser + Bun resolve
// the same implementation (pako works in both environments).
import { deflate, inflate } from "pako";

export function deflateSync(data: Uint8Array): Uint8Array {
  return deflate(data);
}

export function inflateSync(data: Uint8Array): Uint8Array {
  return inflate(data);
}

export function strToU8(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

export function strFromU8str(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}
