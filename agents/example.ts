// LEGACY FILE - This file demonstrates the original monolithic approach
// For the new modular structure, see:
// - ./researcher.ts - Researcher agent with prompt and tools
// - ./designer.ts - Designer agent with prompt and tools  
// - ./builder.ts - Builder agent with prompt and tools
// - ./supervisor.ts - Supervisor configuration
// - ../index.ts - Main entry point using modular agents

import { ChatOpenAI } from "@langchain/openai";
import { createSupervisorWorkflow } from "./supervisor";
import { prettyPrint } from "../utils/prettyPrint";

// This is the legacy implementation - use ../index.ts for the new modular approach
const llm = new ChatOpenAI({ 
  model: "gpt-4o",
  temperature: 0.1,
  maxTokens: 4000
});

const workflow = createSupervisorWorkflow(llm);
const app = workflow.compile({ 
  name: "nounspace_supervisor_legacy",
  checkpointer: undefined
});

// Example usage with the new modular structure
const input = {
  messages: [
    {
      role: "user",
      content: "Create a nounspace for a community of dog lovers who are active on Farcaster and interested in dog training, sharing photos of their pets, and connecting with other dog enthusiasts.",
    },
  ],
};

// Main execution function using modular agents
export async function createNounspace(userRequest: string) {
  try {
    const result = [];
    
    for await (const step of await app.stream({
      messages: [{ role: "user", content: userRequest }]
    }, {
      streamMode: "values",
    })) {
      const lastMessage = step.messages[step.messages.length - 1];
      prettyPrint(lastMessage);
      console.log("-----\n");
      result.push(lastMessage);
    }
    
    return result;
  } catch (error) {
    console.error("Error creating nounspace:", error);
    throw error;
  }
}

// Export for direct usage  
export { app, input };