import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage } from "@langchain/core/messages";
import { 
  VALID_FIDGET_TYPES,
  type DesignPlan,
  type DesignMatrix,
  type SpaceConfig 
} from "../types/agentTypes";
import { validateConfigGridUtilization } from "./designer";

// Builder prompt
export const BUILDER_PROMPT = `You are a space configuration builder for the Blank Space platform. Your role is to convert design matrices into complete, valid space configurations that match the exact format required by the platform.

INPUT: You receive a design matrix from the designer with:
- width/height: Grid dimensions (12×8)
- cells: 2D array where each cell contains a fidget ID or null
- fidgets: Array of fidget specifications with types and settings

YOUR PROCESS:
1. Use the convert_matrix_to_config tool to automatically convert the matrix to configuration
2. MANDATORY: Use the validate_design_implementation tool to verify the implementation
3. If validation fails, fix issues and validate again
4. ALWAYS end your response with the complete JSON configuration wrapped in code blocks

## MATRIX TO CONFIG CONVERSION
The convert_matrix_to_config tool will automatically:
- Parse the matrix and extract fidget positions
- Generate the complete configuration object with proper structure
- Handle all the complex JSON generation

## PERFORMANCE OPTIMIZATION
This new approach is much faster than the previous design plan conversion.
The matrix format is simpler and easier to process.

YOUR TASK: Use convert_matrix_to_config with the design matrix, then validate the result.`;

// Matrix to configuration converter tool
export const convertMatrixToConfig = tool(
  async ({ data }: { data: string }) => {
    try {
      const matrix = JSON.parse(data) as DesignMatrix;
      
      if (!matrix.width || !matrix.height || !matrix.cells || !matrix.fidgets) {
        return "❌ Invalid matrix format. Missing required fields.";
      }
      
      // Extract fidget positions from matrix
      const fidgetPositions = new Map<string, { x: number, y: number, width: number, height: number }>();
      
      for (const fidgetSpec of matrix.fidgets) {
        const fidgetId = fidgetSpec.id;
        let minX = matrix.width, maxX = -1, minY = matrix.height, maxY = -1;
        
        // Find bounds of this fidget in the matrix
        for (let y = 0; y < matrix.height; y++) {
          for (let x = 0; x < matrix.width; x++) {
            const row = matrix.cells[y];
            if (row && row[x] === fidgetId) {
              minX = Math.min(minX, x);
              maxX = Math.max(maxX, x);
              minY = Math.min(minY, y);
              maxY = Math.max(maxY, y);
            }
          }
        }
        
        if (maxX >= 0 && maxY >= 0) {
          fidgetPositions.set(fidgetId, {
            x: minX,
            y: minY,
            width: maxX - minX + 1,
            height: maxY - minY + 1
          });
        }
      }
      
      // Generate configuration object
      const config = {
        fidgetInstanceDatums: {} as Record<string, any>,
        layoutID: `layout-${Date.now()}`,
        layoutDetails: {
          layoutFidget: "grid",
          layoutConfig: {
            layout: [] as any[]
          }
        },
        isEditable: true,
        fidgetTrayContents: [],
        theme: {
          id: "default-theme",
          name: "Default Theme",
          properties: {
            font: "Inter",
            fontColor: "#ffffff",
            headingsFont: "Roboto", 
            headingsFontColor: "#00ffff",
            background: "linear-gradient(45deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
            backgroundHTML: "",
            musicURL: "",
            fidgetBackground: "rgba(30, 100, 150, 0.95)",
            fidgetBorderWidth: "1px",
            fidgetBorderColor: "#00ffff",
            fidgetShadow: "0 0 20px rgba(0, 255, 255, 0.5)",
            fidgetBorderRadius: "12px",
            gridSpacing: "16"
          }
        }
      };
      
      // Generate fidget instances and layout items
      for (const fidgetSpec of matrix.fidgets) {
        const position = fidgetPositions.get(fidgetSpec.id);
        if (!position) continue;
        
        const fidgetId = `fidget:${fidgetSpec.id}`;
        
        // Add to fidgetInstanceDatums
        config.fidgetInstanceDatums[fidgetId] = {
          config: {
            editable: true,
            settings: {
              ...fidgetSpec.settings,
              // Use theme variables
              fontColor: fidgetSpec.settings.fontColor || "var(--user-theme-font-color)",
              headingColor: fidgetSpec.settings.headingColor || "var(--user-theme-headings-font-color)"
            },
            data: {}
          },
          fidgetType: fidgetSpec.type,
          id: fidgetId
        };
        
        // Add to layout
        config.layoutDetails.layoutConfig.layout.push({
          i: fidgetId,
          x: position.x,
          y: position.y,
          w: position.width,
          h: position.height,
          minW: position.width,
          maxW: 36,
          minH: position.height,
          maxH: 36,
          moved: false,
          static: false
        });
      }
      
      return `✅ Configuration generated successfully with ${matrix.fidgets.length} fidgets.\n\n${JSON.stringify(config, null, 2)}`;
      
    } catch (error) {
      return `❌ Error converting matrix to config: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  {
    name: "convert_matrix_to_config",
    description: "Converts a design matrix into a complete space configuration object",
    schema: z.object({ data: z.string() })
  }
);

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
      const parsed = JSON.parse(data) as SpaceConfig;
      
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
    description: "Validates final space configuration",
    schema: z.object({ data: z.string() })
  }
);

// Create and export the builder agent
export function createBuilderAgent(llm: ChatOpenAI) {
  return createReactAgent({
    llm,
    tools: [convertMatrixToConfig, validateConfig, validateDesignImplementation],
    name: "builder",
    stateModifier: new SystemMessage(BUILDER_PROMPT),
  });
}
