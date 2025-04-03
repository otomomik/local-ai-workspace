import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { spawn } from "node:child_process";

const server = new McpServer({
  name: "NpmAgent",
  version: "0.0.1",
});

if (process.argv.length < 3) {
  throw new Error("Please provide the parent folder path as an argument.");
}

const parentFolder = process.argv[2];
console.error(`Parent folder: ${parentFolder}`);

const promiseTerminal = async (process: ReturnType<typeof spawn>) => {
  return await new Promise<Record<string, string>>((resolve) => {
    try {
      let stdoutData = "";
      let stderrData = "";
      const processTimeout = setTimeout(() => {
        process.kill("SIGTERM");
        resolve({
          error: "Process timed out",
          stdout: stdoutData,
          stderr: stderrData,
        });
      }, 1000 * 60);
      let outputTimeout: NodeJS.Timeout | null = null;

      const resetOutputTimeout = () => {
        if (outputTimeout) clearTimeout(outputTimeout);
        outputTimeout = setTimeout(() => {
          clearTimeout(processTimeout);
          process.kill("SIGTERM");
          resolve({
            error:
              "The input cannot be accepted, so it should be passed as a parameter.",
            stdout: stdoutData,
            stderr: stderrData,
          });
        }, 30 * 1000);
      };

      process.stdout?.on("data", (data) => {
        stdoutData += data;
        resetOutputTimeout();
      });

      process.stderr?.on("data", (data) => {
        stderrData += data;
        resetOutputTimeout();
      });

      process.on("error", (err) => {
        clearTimeout(processTimeout);
        if (outputTimeout) clearTimeout(outputTimeout);
        resolve({
          error: err.message,
          stdout: stdoutData,
          stderr: stderrData,
        });
      });

      process.on("close", (code) => {
        clearTimeout(processTimeout);
        if (outputTimeout) clearTimeout(outputTimeout);
        process.kill("SIGTERM");
        if (code !== 0) {
          resolve({
            error: `Process exited with code ${code}`,
            stdout: stdoutData,
            stderr: stderrData,
          });
        } else {
          resolve({ stdout: stdoutData, stderr: stderrData });
        }
      });

      // 親プロセスから切り離してバックグラウンドで動作させる
      process.unref();
      resetOutputTimeout();
    } catch (e: any) {
      resolve({
        error: e.message,
        stdout: "",
        stderr: "",
      });
    }
  })
    .then((result) => {
      return {
        isError: "error" in result,
        content: Object.keys(result).map((key) => ({
          type: "text",
          text: `${key}: ${result[key]}`,
        })),
      };
    })
    .catch((error) => {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error: ${error.message}`,
          },
        ],
      };
    });
};

server.tool(
  "use_npm_init",
  "This tool allows you to execute any `npm init` command in a specified directory.",
  {
    path: z
      .string()
      .describe(
        "The path to the directory where the `npm init` command will be executed.",
      ),
    commands: z
      .string()
      .array()
      .describe(
        "The `npm init` command to run. This can be any command you'd normally execute in the terminal. The `npm init` is automatically provided, so it can be omitted.",
      ),
  },
  async ({ path, commands }): Promise<any> => {
    if (!path.startsWith(parentFolder)) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error: The path must start with ${parentFolder}`,
          },
        ],
      };
    }

    try {
      const process = spawn("npm", ["init", ...commands], {
        cwd: path,
        detached: true,
      });
      return await promiseTerminal(process);
    } catch (e: any) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error: ${e.message}`,
          },
        ],
      };
    }
  },
);

server.tool(
  "use_npm_create",
  "This tool allows you to execute any `npm create` command in a specified directory.",
  {
    path: z
      .string()
      .describe(
        "The path to the directory where the `npm create` command will be executed.",
      ),
    commands: z
      .string()
      .array()
      .describe(
        "The `npm create` command to run. This can be any command you'd normally execute in the terminal. The `npm create` is automatically provided, so it can be omitted.",
      ),
  },
  async ({ path, commands }): Promise<any> => {
    if (!path.startsWith(parentFolder)) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error: The path must start with ${parentFolder}`,
          },
        ],
      };
    }

    try {
      const process = spawn("npm", ["create", ...commands], {
        cwd: path,
        detached: true,
      });
      return await promiseTerminal(process);
    } catch (e: any) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error: ${e.message}`,
          },
        ],
      };
    }
  },
);

server.tool(
  "use_npm_install",
  "This tool allows you to execute any `npm install` command in a specified directory.",
  {
    path: z
      .string()
      .describe(
        "The path to the directory where the `npm install` command will be executed.",
      ),
    commands: z
      .string()
      .array()
      .optional()
      .describe(
        "The `npm install` command to run. This can be any command you'd normally execute in the terminal. The `npm install` is automatically provided, so it can be omitted.",
      ),
  },
  async ({ path, commands = [] }): Promise<any> => {
    if (!path.startsWith(parentFolder)) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error: The path must start with ${parentFolder}`,
          },
        ],
      };
    }

    try {
      const process = spawn("npm", ["install", ...commands], {
        cwd: path,
        detached: true,
      });
      return await promiseTerminal(process);
    } catch (e: any) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error: ${e.message}`,
          },
        ],
      };
    }
  },
);

// server.tool(
//   "use_npm_run",
//   "This tool allows you to execute any `npm run` command in a specified directory.",
//   {
//     path: z
//       .string()
//       .describe(
//         "The path to the directory where the `npm run` command will be executed.",
//       ),
//     commands: z
//       .string()
//       .array()
//       .describe(
//         "The `npm run` command to run. This can be any command you'd normally execute in the terminal. The `npm run` is automatically provided, so it can be omitted.",
//       ),
//   },
//   async ({ path, commands }): Promise<any> => {
//     if (!path.startsWith(parentFolder)) {
//       return {
//         isError: true,
//         content: [
//           {
//             type: "text",
//             text: `Error: The path must start with ${parentFolder}`,
//           },
//         ],
//       };
//     }
//
//     try {
//       const process = spawn("npm", ["run", ...commands], {
//         cwd: path,
//         detached: true,
//       });
//       return await promiseTerminal(process);
//     } catch (e: any) {
//       return {
//         isError: true,
//         content: [
//           {
//             type: "text",
//             text: `Error: ${e.message}`,
//           },
//         ],
//       };
//     }
//   },
// );

server.tool(
  "use_npx",
  "This tool allows you to execute any `npx` command in a specified directory.",
  {
    path: z
      .string()
      .describe(
        "The path to the directory where the `npx` command will be executed.",
      ),
    commands: z
      .string()
      .array()
      .describe(
        "The `npx` command to run. This can be any command you'd normally execute in the terminal. The `npx` is automatically provided, so it can be omitted.",
      ),
  },
  async ({ path, commands }): Promise<any> => {
    if (!path.startsWith(parentFolder)) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error: The path must start with ${parentFolder}`,
          },
        ],
      };
    }

    try {
      const process = spawn("npx", commands, {
        cwd: path,
        detached: true,
      });
      return await promiseTerminal(process);
    } catch (e: any) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error: ${e.message}`,
          },
        ],
      };
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
