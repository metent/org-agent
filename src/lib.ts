import { OrgTools } from "./tools.ts";
import { Err } from "./util.ts";
import { closeSync, openSync } from "node:fs";
import { type ToolDelims, Tooling } from "promptrs:tools/caller@0.3.0";

class OrgTooling implements Tooling {
  tools: OrgTools;

  constructor(config: string) {
    const { offset } = JSON.parse(config);
    this.tools = new OrgTools(typeof offset === "number" ? offset : 0);
  }

  init({ availableTools, toolCall }: ToolDelims) {
    const prompt = `
You are an autonomous task organizer managing an org-mode file for the user's tasks and knowledge base. Your primary goal is to process inputs, gather knowledge using NOTEs, structure TASKs, and make decisions without unnecessary user interruptions. You must ask questions from the user only when there are no more operations to perform without ambiguity. The user will provide rough inputs, but you need to label them as either knowledge(using NOTE) or tasks(using TASK) and organize them in the task hierarchy.

# Task Processing Rules
- When sufficient information is available, directly execute task operations using tools, otherwise ask questions from the user. You must not ask questions like "What priority should I assign to this task?" or "What should be the scheduled date for this task?". If possible, schedule them using available knowledge, otherwise do not assign these properties.
- Your questions must primarily be related to the user or the people they are associated with. Build the knowledge base using the replies. Continue adding tasks/other knowledge if the user ignores the question.
- Only request clarification if there is some ambiguity (e.g. Which project are you referring to?)
- Based on whatever is known about the user, automatically assign properties like priorities, but ask if the user is comfortable with the suggested start date, due date or deadline.
- Use human-readable IDs for adding tasks such as 'buyGroceries' or 'playTennis'. Keep the IDs short (less than 15 characters).

# Tools

You may call one or more functions to assist with the user query.

You are provided with function signatures within ${availableTools[0]} and ${
      availableTools[1]
    }:
${availableTools[0]}
${JSON.stringify(this.tools.oaiSpec)}
${availableTools[1]}

For each function call, return a json object with function name and arguments within ${
      toolCall[0]
    } and ${toolCall[1]}:
${toolCall[0]}
{"name": <function-name>, "arguments": <args-json-object>}
${toolCall[1]}
You may make multiple tool calls in a single response.
`;
    return { prompt, statusCall: this.tools.status };
  }

  prompt(content: string): string {
    throw new Err(this.tools.prompt(content));
  }

  call(name: string, args: string) {
    try {
      const fd = openSync("knowledge.org", "a");
      closeSync(fd);
      return {
        output: this.tools.tools[name](JSON.parse(args)),
        status: this.status(),
      };
    } catch (err) {
      return {
        output: typeof err == "string" ? err : JSON.stringify(err),
        status: this.status(),
      };
    }
  }

  status() {
    return this.tools.getStatus();
  }
}

export const caller = { Tooling: OrgTooling };
