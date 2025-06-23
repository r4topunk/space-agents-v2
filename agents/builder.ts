import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage } from "@langchain/core/messages";
import { 
  VALID_FIDGET_TYPES,
  type DesignPlan,
  type NounspaceConfig 
} from "../types/agentTypes";

// Builder prompt
export const BUILDER_PROMPT = `You are a nounspace configuration builder. Your role is to convert design plans into complete, valid nounspace configurations that match the exact format required by the platform.

INPUT: You receive a design plan with fidgets array and gridLayout from the designer.

YOUR PROCESS:
1. Convert the design plan into a complete nounspace configuration object
2. MANDATORY: Use the validate_design_implementation tool to verify your implementation matches the design exactly
3. If validation fails, fix the issues and validate again
4. ALWAYS end your response with the complete JSON configuration wrapped in code blocks

IMPORTANT: Your final response must include the complete JSON configuration even after validation passes.

YOUR TASK: Convert the design plan into a complete nounspace configuration object that matches the configExample.ts structure.

REQUIRED OUTPUT FORMAT: Return ONLY a valid JSON object with this EXACT structure:

{
  "fidgetInstanceDatums": {
    "fidget:id": {
      "config": {
        "editable": true,
        "settings": { /* fidget-specific settings */ },
        "data": {}
      },
      "fidgetType": "text",
      "id": "fidget:id"
    }
  },
  "layoutID": "unique-layout-identifier",
  "layoutDetails": {
    "layoutFidget": "grid",
    "layoutConfig": {
      "layout": [
        {
          "i": "fidget:id",
          "x": 0,
          "y": 0,
          "w": 3,
          "h": 2,
          "minW": 3,
          "maxW": 36,
          "minH": 2,
          "maxH": 36,
          "moved": false,
          "static": false
        }
      ]
    }
  },
  "isEditable": true,
  "fidgetTrayContents": [],
  "theme": {
    "id": "theme-id",
    "name": "Theme Name",
    "properties": {
      "font": "Inter",
      "fontColor": "#ffffff",
      "headingsFont": "Roboto",
      "headingsFontColor": "#00ffff",
      "background": "linear-gradient(45deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
      "backgroundHTML": "",
      "musicURL": "",
      "fidgetBackground": "rgba(30, 100, 150, 0.95)",
      "fidgetBorderWidth": "1px",
      "fidgetBorderColor": "#00ffff",
      "fidgetShadow": "0 0 20px rgba(0, 255, 255, 0.5)",
      "fidgetBorderRadius": "12px",
      "gridSpacing": "16"
    }
  }
}

KEY REQUIREMENTS:
- fidgetInstanceDatums: Object with fidget configurations keyed by fidget ID
- layoutDetails: Must include layout array with position data for each fidget
- theme: Complete theme object with all required properties
- Use theme variables like var(--user-theme-font-color) in fidget settings
- Each layout item needs: i (fidget ID), x, y, w, h, minW, maxW, minH, maxH, moved: false, static: false
- All fidget IDs must match between fidgetInstanceDatums and layout array
- CRITICAL: Layout positions (x,y,w,h) must exactly match the design plan

Generate the complete nounspace configuration matching this exact structure and validate implementation fidelity.`;

// Validation tool to check if builder properly implements the design
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

// Create and export the builder agent
export function createBuilderAgent(llm: ChatOpenAI) {
  return createReactAgent({
    llm,
    tools: [validateConfig, validateDesignImplementation],
    name: "builder",
    stateModifier: new SystemMessage(BUILDER_PROMPT),
  });
}
