import { $ } from "bun";
import { build as esbuild } from "esbuild";

type Manifest = { layers: { mediaType: string; digest: string }[] };

async function build() {
  await $`bunx swc \
    -C jsc.parser.syntax=typescript \
    -C jsc.parser.decorators=true \
    -C jsc.transform.decoratorVersion='2022-03' \
    -C env.targets.node=23 \
    -d dist \
    --out-file-extension ts \
  src`;

  await Bun.build({
    target: "node",
    external: [
      "wasi:cli/stdin@0.2.3",
      "wasi:filesystem/preopens@0.2.3",
      "wasi:filesystem/types@0.2.3",
    ],
    entrypoints: ["dist/src/lib.ts"],
    outdir: "dist/",
  });

  await esbuild({
    bundle: true,
    platform: "node",
    format: "esm",
    external: ["wasi:*"],
    alias: {
      "node:fs": "./shim/fs.ts",
      "fs": "./shim/fs.ts",
    },
    entryPoints: ["dist/lib.js"],
    outfile: "dist/org_tools.js",
  });

  await $`bunx jco componentize \
    --wit wit/ \
    --world-name tools \
    --disable http \
    --out dist/org_tools.wasm \
  dist/org_tools.js`;

  const deps = [
    "promptrs:openai-client@0.2.0",
    "promptrs:standard-parser@0.2.1",
    "promptrs:unit-agent@0.3.4",
  ].map((dep) => {
    const splits = dep.split("@");
    return { image: splits[0].replace(":", "/"), version: splits[1] };
  });
  const fetcher = await WasmFetcher.init(deps.map((dep) => dep.image));
  for (const { image, version } of deps) {
    await fetcher.fetch(image, version);
  }

  const cwd = process.cwd();
  await $`bunx jco run --jco-dir dist/ \
    wac.wasm plug ${cwd}/dist/promptrs:unit-agent.wasm \
    --plug ${cwd}/dist/promptrs:openai-client.wasm \
    --plug ${cwd}/dist/promptrs:standard-parser.wasm \
    --plug ${cwd}/dist/org_tools.wasm \
  --output ${cwd}/dist/org_agent.wasm`;
}

class WasmFetcher {
  private readonly token: string;

  constructor(token: string) {
    this.token = token;
  }

  static async init(images: string[]) {
    const tokenUrl = new URL("https://ghcr.io/token");
    tokenUrl.searchParams.append("registry", "ghcr.io");
    for (const image of images) {
      tokenUrl.searchParams.append("scope", `repository:${image}:pull`);
    }
    const tokenResponse = await fetch(tokenUrl.href);
    const { token } = await tokenResponse.json() as { token: string };
    return new WasmFetcher(token);
  }

  async fetch(image: string, tag: string) {
    const manifest = await this.getManifest(image, tag);
    const digest = this.getDigest(manifest);
    const path = `dist/${image.replace("/", ":")}.wasm`;
    try {
      const file = Bun.file(path);
      const cached = Bun.SHA256.hash(await file.bytes(), "hex");
      if (!digest.startsWith("sha256:") || digest.slice(7) !== cached) {
        await file.delete();
        throw Error("Download needed.");
      }
    } catch (_) {
      await this.download(image, path, digest);
    }
  }

  private async getManifest(image: string, tag: string): Promise<Manifest> {
    const manifestUrl = `https://ghcr.io/v2/${image}/manifests/${tag}`;
    const manifestResponse = await fetch(manifestUrl, {
      headers: {
        "Authorization": `Bearer ${this.token}`,
        "Accept": "application/vnd.oci.image.manifest.v1+json",
      },
    });

    const manifest = await manifestResponse.json();
    if (manifestResponse.ok) return manifest as Manifest;

    throw new Error(
      `Manifest request failed with status ${manifestResponse.status}: ${
        JSON.stringify(manifest)
      }`,
    );
  }

  private getDigest(manifest: Manifest) {
    const wasmLayer = manifest.layers.find((layer) =>
      layer.mediaType === "application/wasm"
    );
    if (!wasmLayer) throw new Error("No WASM layer found in manifest");

    return wasmLayer.digest;
  }

  private async download(image: string, path: string, digest: string) {
    const blobUrl = `https://ghcr.io/v2/${image}/blobs/${digest}`;

    const response = await fetch(blobUrl, {
      headers: { "Authorization": `Bearer ${this.token}` },
    });

    if (!response.ok) {
      throw new Error(`Blob download failed with status ${response.status}`);
    }

    await Bun.write(`${path}`, response);
    console.log(`${image} downloaded`);
  }
}

await build();
