# org-agent

An AI agent that automatically organizes tasks in an org-mode file.

## Build Instructions

Customize the base URL, model, API key and parsing logic(which is dependent on the model used) accordingly and then compile the code into a WASM component using

```
bun compile
```

On successful compilation, `dist/` should contain `org_agent.wasm` which needs to be copied into `/usr/lib/`.

## Usage

Install `wasmtime`, `jq` and `yq`, then run using

```
mkdir ~/.config/org-agent
cp contrib/config.yaml ~/.config/org-agent/
mkdir ~/tasks
./contrib/org-agent path/to/org-agent.wasm
```
