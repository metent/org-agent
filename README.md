# org-agent

An AI agent that automatically organizes tasks in an org-mode file.

## Build Instructions

Customize the base URL, model, API key and parsing logic(which is dependent on the model used) accordingly and then compile the code into a WASM component using

```
bun compile
```

On successful compilation, `dist/` should contain `org_agent.wasm` which needs to be copied into `/usr/lib/`.

## Usage

For running on linux, first install the following dependencies
- A terminal emulator (set it as $TERM)
- A CLI text editor (set it as $EDITOR)
- `wasmtime`, `jq`, `yq`, `inotify-tools`

then run using
```
mkdir ~/.config/org-agent
cp contrib/config.yaml ~/.config/org-agent/
mkdir ~/tasks
touch ~/tasks/knowledge.org
touch ~/tasks/knowledge.prompt
./contrib/prmpt &
./contrib/org-agent
```
