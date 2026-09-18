import { createInterface } from "node:readline";
import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropicClient } from "../lib/agent/client";
import { runAgentTurn } from "../lib/agent/loop";

async function main() {
  let client;
  try {
    client = getAnthropicClient();
  } catch (err) {
    console.error((err as Error).message);
    console.error("Set ANTHROPIC_API_KEY in .env.local (see .env.example) to use npm run chat.");
    process.exit(1);
  }

  console.log("খামারমিত্র — terminal chat. Ctrl+C to quit.\n");
  let history: Anthropic.MessageParam[] = [];

  const rl = createInterface({ input: process.stdin, output: process.stdout, prompt: "you> " });
  rl.prompt();

  rl.on("line", async (line) => {
    const message = line.trim();
    if (!message) {
      rl.prompt();
      return;
    }
    const result = await runAgentTurn(history, message, {
      client,
      onLogEvent: (stage, data) => console.log(`  [log_event] ${stage} ${JSON.stringify(data)}`),
    });
    for (const call of result.toolCalls) {
      console.log(`  [tool] ${call.name}(${JSON.stringify(call.input)}) -> ${JSON.stringify(call.output)}`);
    }
    history = result.history;
    console.log(`bot> ${result.replyText}\n`);
    rl.prompt();
  });
}

main();
