// TODO basic -> BuildIn
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { stopToolName, thinkToolName } from "./mcp.js";
import { z } from "zod";

const server = new McpServer({
  name: "BasicAgent",
  version: "0.0.1",
});

server.tool(
  stopToolName,
  "A tool used to terminate the agent's workflow. It is called when a task is completed and ends the agent's execution normally. By calling this tool, the agent indicates that the current task has been completed and notifies the system that it is ready for new tasks.",
  async () => {
    return {
      content: [],
    };
  },
);

server.tool(
  thinkToolName,
  "A tool for the agent to execute its thinking process. Used when solving complex problems or making decisions, this tool makes the agent's internal processing more transparent. By using this tool, the agent can explicitly demonstrate its reasoning process.",
  {
    thought: z
      .string()
      .describe(
        "Receives the agent's thinking content as a string. This argument should include the agent's reasoning process, considerations, or approach to the problem in detail.",
      ),
  },
  async () => {
    return {
      content: [
        {
          type: "text",
          text: "The content generated through 'think' is provided via the AI role, so please proceed to the next step accordingly.",
        },
      ],
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);

// ```json
// {
//   "tools": [
//     {
//       "name": "agent-end",
//       "description": "Terminates the agent's workflow when a task is completed.",
//       "args": {},
//       "response": "Task completed. Agent workflow terminated."
//     },
//     {
//       "name": "think",
//       "description": "Executes and records the agent's reasoning process. This is the foundational step that guides subsequent actions.",
//       "args": {
//         "thought": "The agent's detailed reasoning process as a string."
//       },
//       "response": "Thinking process analyzed and integrated. Proceeding based on this reasoning."
//     },
//     {
//       "name": "answer",
//       "description": "Displays the final response or results to the user.",
//       "args": {
//         "answer": "The content to be presented to the user as a string."
//       },
//       "response": "Answer delivered to user successfully."
//     },
//     {
//       "name": "question",
//       "description": "Requests additional information from the user to proceed with the task.",
//       "args": {
//         "question": "The question text to be presented to the user as a string."
//       },
//       "response": "Question posed to user. Awaiting response."
//     }
//   ]
// }
// ```
