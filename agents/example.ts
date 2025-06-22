import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage } from "@langchain/core/messages";
import { TavilySearch } from "@langchain/tavily";
import { createSupervisor } from "@langchain/langgraph-supervisor";



export const add = tool(
  async ({ a, b }: { a: number; b: number }) => a + b,
  {
    name: "add",
    description: "Add two numbers",
    schema: z.object({ a: z.number(), b: z.number() })
  }
);

const llm = new ChatOpenAI({ model: "gpt-4o" });

export const mathAgent = createReactAgent({
  llm,
  tools: [add],
  name: "math_expert",
  stateModifier: new SystemMessage(
    "You are a math expert. Always use only **one** tool at a time."
  ),
});

export const researchAgent = createReactAgent({
  llm,
  tools: [new TavilySearch()],
  name: "research_expert",
  stateModifier: new SystemMessage(
    "You are a research and *don't* do math"
  ),
});

const workflow = createSupervisor({
  agents: [researchAgent, mathAgent],
  llm,
  prompt:
    "You are the supervisor of a team with a researcher and a math expert. " +
    "Delegate each message to the correct agent and give FINISH when the objective is achieved."
});

// here you can attach memory, checkpointer or store if you want
const app = workflow.compile({ name: "supervisor_v1" });

const result = await app.invoke({
  messages: [
    { role: "user", content: "What is the sum of 12 + 30?" }
  ]
});

console.log(result);