import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage } from "@langchain/core/messages";
import { TavilySearch } from "@langchain/tavily";
import { createSupervisor } from "@langchain/langgraph-supervisor";
import { prettyPrint } from "../utils/prettyPrint";
import {
  BUILDER_PROMPT,
  DESIGNER_PROMPT,
  RESEARCHER_PROMPT,
} from "../utils/supervisorPrompts";
import { 
  VALID_FIDGET_TYPES, 
  FIDGET_MIN_SIZES,
  type ResearchData,
  type DesignPlan,
  type NounspaceConfig 
} from "../types/agentTypes";

// Validation tool for research output
export const validateResearch = tool(
  async ({ data }: { data: string }) => {
    try {
      const parsed = JSON.parse(data) as ResearchData;
      
      // Basic validation
      if (!parsed.summary || !parsed.keyTopics || !parsed.socialAccounts) {
        return "Invalid research format. Missing required fields.";
      }
      
      return "Research data is valid and properly formatted.";
    } catch (error) {
      return `Invalid JSON format: ${error}`;
    }
  },
  {
    name: "validate_research",
    description: "Validates research output format",
    schema: z.object({ data: z.string() })
  }
);

// Validation tool for design output
export const validateDesign = tool(
  async ({ data }: { data: string }) => {
    try {
      const parsed = JSON.parse(data) as DesignPlan;
      
      if (!parsed.fidgets || !parsed.gridLayout || !parsed.rationale) {
        return "Invalid design format. Missing required fields.";
      }
      
      // Validate fidget types and sizes
      for (const fidget of parsed.fidgets) {
        if (!VALID_FIDGET_TYPES.includes(fidget.type as any)) {
          return `Invalid fidget type: ${fidget.type}`;
        }
        
        const minSize = FIDGET_MIN_SIZES[fidget.type as keyof typeof FIDGET_MIN_SIZES];
        if (fidget.position.width < minSize.width || fidget.position.height < minSize.height) {
          return `Fidget ${fidget.id} is too small. Minimum size: ${minSize.width}x${minSize.height}`;
        }
      }
      
      return "Design plan is valid and meets requirements.";
    } catch (error) {
      return `Invalid JSON format: ${error}`;
    }
  },
  {
    name: "validate_design",
    description: "Validates design plan format and constraints",
    schema: z.object({ data: z.string() })
  }
);

// Validation tool for builder output
export const validateConfig = tool(
  async ({ data }: { data: string }) => {
    try {
      const parsed = JSON.parse(data) as NounspaceConfig;
      
      if (!Array.isArray(parsed)) {
        return "Configuration must be an array of fidget instances.";
      }
      
      const ids = new Set();
      for (const fidget of parsed) {
        if (!fidget.config || !fidget.fidgetType || !fidget.id) {
          return "Each fidget must have config, fidgetType, and id fields.";
        }
        
        if (ids.has(fidget.id)) {
          return `Duplicate fidget ID: ${fidget.id}`;
        }
        ids.add(fidget.id);
        
        if (!VALID_FIDGET_TYPES.includes(fidget.fidgetType as any)) {
          return `Invalid fidget type: ${fidget.fidgetType}`;
        }
      }
      
      return "Configuration is valid and properly formatted.";
    } catch (error) {
      return `Invalid JSON format: ${error}`;
    }
  },
  {
    name: "validate_config",
    description: "Validates final nounspace configuration",
    schema: z.object({ data: z.string() })
  }
);

const llm = new ChatOpenAI({ 
  model: "gpt-4o",
  temperature: 0.1, // Lower temperature for more consistent structured output
  maxTokens: 4000
});

const researcherAgent = createReactAgent({
  llm,
  tools: [new TavilySearch(), validateResearch],
  name: "researcher",
  stateModifier: new SystemMessage(RESEARCHER_PROMPT),
});

const designerAgent = createReactAgent({
  llm,
  tools: [validateDesign],
  name: "designer", 
  stateModifier: new SystemMessage(DESIGNER_PROMPT),
});

const builderAgent = createReactAgent({
  llm,
  tools: [validateConfig],
  name: "builder",
  stateModifier: new SystemMessage(BUILDER_PROMPT),
});

const workflow = createSupervisor({
  agents: [researcherAgent, designerAgent, builderAgent],
  llm,
  prompt: `You are the supervisor of a nounspace creation team with three specialists:

1. **RESEARCHER**: Gathers information and provides structured research data
2. **DESIGNER**: Creates layout plans with fidget positioning and settings  
3. **BUILDER**: Generates final JSON configuration for the nounspace

## WORKFLOW
1. Start with RESEARCHER to gather comprehensive information
2. Pass research results to DESIGNER to create layout plan
3. Pass design plan to BUILDER to generate final configuration
4. Use FINISH when the complete JSON configuration is ready

## QUALITY CONTROL
- Each agent has validation tools to ensure output quality
- Ensure data flows properly between agents
- Verify final output is valid before finishing

Delegate tasks strategically and ensure high-quality results at each step.`,
});

// Compile with error handling and checkpointing support
const app = workflow.compile({ 
  name: "nounspace_supervisor_v3",
  checkpointer: undefined // Add checkpointer here if needed for persistence
});

// Example usage with improved input structure
const input = {
  messages: [
    {
      role: "user",
      content: "Create a nounspace for a community of dog lovers who are active on Farcaster and interested in dog training, sharing photos of their pets, and connecting with other dog enthusiasts.",
    },
  ],
};

// Main execution with error handling
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