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
      
      // Calculate grid coverage to ensure design fills the 12x10 space
      const gridWidth = 12;
      const gridHeight = 10; // Fixed 10 rows for 12x10 grid
      const totalGridCells = gridWidth * gridHeight; // 120 cells
      
      let occupiedCells = 0;
      let maxRowUsed = 0;
      
      for (const fidget of parsed.fidgets) {
        occupiedCells += fidget.position.width * fidget.position.height;
        maxRowUsed = Math.max(maxRowUsed, fidget.position.y + fidget.position.height);
      }
      
      const coveragePercentage = (occupiedCells / totalGridCells) * 100;
      
      if (coveragePercentage < 60) {
        return `Grid coverage too low: ${coveragePercentage.toFixed(1)}% of 12×10 grid. Design must cover at least 60% (72+ cells out of 120). Add more fidgets or increase existing fidget sizes to fill the space better.`;
      }
      
      // Check if design utilizes the full 10-row height
      if (maxRowUsed < 8) {
        return `Design only uses ${maxRowUsed} rows out of 10. Please extend fidgets to use more of the vertical space in the 12×10 grid. Target: use at least 8-10 rows.`;
      }
      
      if (coveragePercentage < 70) {
        return `Grid coverage could be improved: ${coveragePercentage.toFixed(1)}% of 12×10 grid. Consider adding more content or expanding existing fidgets to better fill the 120-cell space. Target: 70%+ (84+ cells).`;
      }
      
      return `Design plan is valid with ${coveragePercentage.toFixed(1)}% coverage of 12×10 grid (${occupiedCells} cells out of 120). Layout meets requirements and uses ${maxRowUsed} rows.`;
    } catch (error) {
      return `Invalid JSON format: ${error}`;
    }
  },
  {
    name: "validate_design",
    description: "Validates design plan format, constraints, and grid coverage",
    schema: z.object({ data: z.string() })
  }
);

// New validation tool to check if builder properly implements the design
export const validateDesignImplementation = tool(
  async ({ designData, configData }: { designData: string, configData: string }) => {
    try {
      const design = JSON.parse(designData) as DesignPlan;
      const config = JSON.parse(configData) as any;
      
      // Check if all designed fidgets are implemented
      const designFidgetIds = design.fidgets.map(f => f.id);
      const configFidgetIds = Object.keys(config.fidgetInstanceDatums || {});
      
      const missingFidgets = designFidgetIds.filter(id => !configFidgetIds.includes(id));
      if (missingFidgets.length > 0) {
        return `Missing fidgets in implementation: ${missingFidgets.join(', ')}. All designed fidgets must be included in the final configuration.`;
      }
      
      const extraFidgets = configFidgetIds.filter(id => !designFidgetIds.includes(id));
      if (extraFidgets.length > 0) {
        return `Extra fidgets in implementation: ${extraFidgets.join(', ')}. Only designed fidgets should be included.`;
      }
      
      // Check if layout positions match the design
      const layoutItems = config.layoutDetails?.layoutConfig?.layout || [];
      for (const designFidget of design.fidgets) {
        const layoutItem = layoutItems.find((item: any) => item.i === designFidget.id);
        if (!layoutItem) {
          return `Layout missing for fidget: ${designFidget.id}`;
        }
        
        // Check if positions are reasonably close (allow some flexibility)
        const positionMatches = 
          layoutItem.x === designFidget.position.x &&
          layoutItem.y === designFidget.position.y &&
          layoutItem.w === designFidget.position.width &&
          layoutItem.h === designFidget.position.height;
          
        if (!positionMatches) {
          return `Position mismatch for ${designFidget.id}. Design: (${designFidget.position.x},${designFidget.position.y},${designFidget.position.width}×${designFidget.position.height}) vs Implementation: (${layoutItem.x},${layoutItem.y},${layoutItem.w}×${layoutItem.h})`;
        }
      }
      
      // Check fidget types match
      for (const designFidget of design.fidgets) {
        const configFidget = config.fidgetInstanceDatums[designFidget.id];
        if (configFidget.fidgetType !== designFidget.type) {
          return `Type mismatch for ${designFidget.id}. Design: ${designFidget.type} vs Implementation: ${configFidget.fidgetType}`;
        }
      }
      
      return "✅ Builder implementation perfectly matches the design plan. All fidgets, positions, and types are correctly implemented.";
    } catch (error) {
      return `Error validating design implementation: ${error}`;
    }
  },
  {
    name: "validate_design_implementation", 
    description: "Validates that the builder correctly implemented the designer's plan",
    schema: z.object({ 
      designData: z.string().describe("The JSON design plan from the designer"),
      configData: z.string().describe("The JSON configuration from the builder")
    })
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
  tools: [validateConfig, validateDesignImplementation],
  name: "builder",
  stateModifier: new SystemMessage(BUILDER_PROMPT),
});

const workflow = createSupervisor({
  agents: [researcherAgent, designerAgent, builderAgent],
  llm,
  prompt: `You are the supervisor of a nounspace creation team with three specialists:

1. **RESEARCHER**: Gathers information and provides structured research data
2. **DESIGNER**: Creates layout plans with optimal grid coverage and fidget positioning  
3. **BUILDER**: Generates final JSON configuration and validates design implementation

## ENHANCED WORKFLOW
1. Start with RESEARCHER to gather comprehensive information
2. Pass research results to DESIGNER to create layout plan
3. DESIGNER must validate their design meets grid coverage requirements (60%+ coverage)
4. Pass design plan to BUILDER to generate final configuration
5. BUILDER must validate that their implementation matches the design exactly
6. BUILDER must output the complete JSON configuration in their final response
7. Use FINISH only when both design validation, implementation validation pass, AND the JSON is provided

## QUALITY CONTROL
- Designer validates grid coverage and space utilization
- Builder validates design implementation fidelity
- Each agent has specialized validation tools
- Ensure designs fill the grid effectively (no large empty spaces)
- Verify final output matches design specifications exactly
- CRITICAL: The final response must contain the complete JSON configuration

Delegate tasks strategically and ensure the BUILDER provides the complete JSON configuration before finishing.`,
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