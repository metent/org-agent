import { getDirectories } from "wasi:filesystem/preopens@0.2.3";
import type {
  Descriptor,
  DescriptorFlags,
  OpenFlags,
  PathFlags,
} from "wasi:filesystem/types@0.2.3";

const rootPath = ".";

export function openSync(path: string, flags: string) {
  const options = {
    read: false,
    write: false,
    truncate: true,
    create: false,
  };
  for (const f of flags) {
    switch (f) {
      case "r":
        options.read = true;
        break;
      case "w":
        options.write = true;
        break;
      case "a":
        options.truncate = false;
        options.create = true;
        break;
      case "+":
        options.create = true;
        break;
    }
  }

  return getFd(path, options);
}

export function closeSync(fd: Descriptor) {
  fd.sync();
}

export function readFileSync(
  path: string,
  options?: null,
): Uint8Array;
export function readFileSync(
  path: string,
  options: BufferEncoding,
): string;
export function readFileSync(
  path: string,
  options?:
    | BufferEncoding
    | null,
): string | Uint8Array {
  const fd = getFd(path, { read: true });
  const [bytes] = fd.read(10_000n, 0n);

  if (options) {
    return new TextDecoder(options).decode(bytes);
  }
  return bytes;
}

export function readdirSync(path: string): string[] {
  const fd = getFd(path, { directory: true, read: true });
  const entries: string[] = [];
  const iter = fd.readDirectory();
  for (
    let dirent = iter.readDirectoryEntry();
    dirent;
    dirent = iter.readDirectoryEntry()
  ) {
    entries.push(dirent.name);
  }
  return entries;
}

export function rmSync(path: string): void {
  const fd = getFd(rootPath, { mutateDirectory: true });

  try {
    fd.removeDirectoryAt(path);
  } catch (_) {
    fd.unlinkFileAt(path);
  }
}

export function writeFileSync(path: string, data: string | Uint8Array): void {
  const fd = getFd(path, { create: true, truncate: true, write: true });

  if (typeof data === "string") {
    data = new TextEncoder().encode(data);
  }

  const outputStream = fd.writeViaStream(0n);
  const pollable = outputStream.subscribe();
  outputStream.write(data);
  pollable.block();
}

function getFd(
  path: string,
  options?: PathFlags & OpenFlags & DescriptorFlags,
) {
  const dirs = Object.fromEntries(
    getDirectories().map(([fd, path]) => [path, fd]),
  );
  if (path in dirs) return dirs[path];

  const pathFlags = { symlinkFollow: options?.symlinkFollow };
  const openFlags = {
    create: options?.create,
    directory: options?.directory,
    exclusive: options?.exclusive,
    truncate: options?.truncate,
  };
  delete options?.symlinkFollow;
  delete options?.create;
  delete options?.directory;
  delete options?.exclusive;
  delete options?.truncate;

  const rootFd = dirs[rootPath] ?? Object.values(dirs)[0];
  const normalizedPath = path.slice(Number(path.startsWith("/")));
  return rootFd.openAt(pathFlags, normalizedPath, openFlags, options ?? {});
}

type BufferEncoding = "utf-8";
