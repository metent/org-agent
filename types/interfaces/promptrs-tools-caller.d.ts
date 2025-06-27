declare module 'promptrs:tools/caller@0.3.0' {
  export interface System {
    prompt: string,
    statusCall: string,
  }
  export interface ToolDelims {
    availableTools: [string, string],
    toolCall: [string, string],
  }
  export interface ToolResponse {
    output: string,
    status?: string,
  }
  
  export class Tooling {
    constructor(config: string)
    init(delims: ToolDelims): System;
    prompt(content: string): string;
    status(): string;
    call(name: string, arguments: string): ToolResponse;
  }
}
