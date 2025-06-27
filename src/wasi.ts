import { getStdin } from "wasi:cli/stdin@0.2.3";

let buffer = new Uint8Array(0);

export function readline() {
  const inputStream = getStdin();
  const CHUNK_SIZE = 4096n;

  while (true) {
    try {
      const data = inputStream.blockingRead(CHUNK_SIZE);
      const newBuf = new Uint8Array(buffer.length + data.length);
      newBuf.set(buffer);
      newBuf.set(data, buffer.length);

      const newLineIndex = newBuf.indexOf(0x0A, buffer.length);
      if (newLineIndex !== -1) {
        const line = new Uint8Array(newLineIndex);
        line.set(newBuf.slice(0, newLineIndex));
        buffer = new Uint8Array(newBuf.slice(newLineIndex + 1));
        return new TextDecoder().decode(line);
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
