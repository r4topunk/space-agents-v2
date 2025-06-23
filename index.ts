import { ChatOpenAI } from "@langchain/openai";
import { createSupervisorWorkflow } from "./agents/supervisor";
import { prettyPrint } from "./utils/prettyPrint";

// LLM configuration
const llm = new ChatOpenAI({ 
  model: "gpt-4o",
  temperature: 0.1, // Lower temperature for more consistent structured output
  maxTokens: 4000
});

// Create the supervisor workflow
const workflow = createSupervisorWorkflow(llm);

// Compile with error handling and checkpointing support
const app = workflow.compile({ 
  name: "blank_space_supervisor_v3",
  checkpointer: undefined // Add checkpointer here if needed for persistence
});

// Main execution function with error handling
export async function createSpace(userRequest: string) {
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
    console.error("Error creating space:", error);
    throw error;
  }
}

// Export the compiled workflow and example input for direct usage
export { app };

// Example usage input
export const exampleInput = {
  messages: [
    {
      role: "user",
      content: "Create a space for a community of dog lovers who are active on Farcaster and interested in dog training, sharing photos of their pets, and connecting with other dog enthusiasts.",
    },
  ],
};