import { getStdin } from "wasi:cli/stdin@0.2.3";

let buffer = new Uint8Array(0);

export function readTill(till: string) {
  const inputStream = getStdin();
  const CHUNK_SIZE = 4096n;
  const tillBytes = new TextEncoder().encode(till);

  const pollable = inputStream.subscribe();
  while (true) {
    try {
      pollable.block();
      const data = inputStream.read(CHUNK_SIZE);
      const newBuf = new Uint8Array(buffer.length + data.length);
      newBuf.set(buffer);
      newBuf.set(data, buffer.length);

      const tillIndex = findSubstringIndex(newBuf, buffer.length, tillBytes);
      if (tillIndex !== -1) {
        const content = new Uint8Array(tillIndex);
        content.set(newBuf.slice(0, tillIndex));
        buffer = new Uint8Array(newBuf.slice(tillIndex + tillBytes.length));
        return new TextDecoder().decode(content);
      }

      buffer = newBuf;
    } catch (e: unknown) {
      if (typeof e == "object" && e && "tag" in e && e.tag == "closed") {
        buffer = new Uint8Array(0);
        return new TextDecoder().decode(buffer);
      }
      throw e;
    }
  }
}

function findSubstringIndex(
  buffer: Uint8Array,
  startIndex: number,
  target: Uint8Array,
): number {
  for (let i = startIndex; i <= buffer.length - target.length; i++) {
    let match = true;
    for (let j = 0; j < target.length; j++) {
      if (buffer[i + j] !== target[j]) {
        match = false;
        break;
      }
    }
    if (match) {
      return i;
    }
  }
  return -1;
}
