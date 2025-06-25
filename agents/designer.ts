import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage } from "@langchain/core/messages";
import { 
  VALID_FIDGET_TYPES, 
  FIDGET_MIN_SIZES,
  type DesignPlan,
  type DesignMatrix,
  type FidgetSpec
} from "../types/agentTypes";

// Designer prompt
export const DESIGNER_PROMPT = `You are a space layout designer for the Blank Space platform. Your role is to create optimal grid layouts using available fidgets.

## INPUT
You will receive research data in JSON format from the researcher. Use this information to design the space.

## AVAILABLE FIDGETS (with minimum sizes)
- **text** (3w×2h): Welcome messages, announcements, instructions
- **gallery** (2w×2h): Images, NFTs, visual content
- **Video** (2w×2h): YouTube/Vimeo embeds
- **feed** (4w×2h): Social media feeds (Farcaster/X)
- **cast** (3w×1h, max 4h): Individual Farcaster posts
- **Chat** (3w×2h): Real-time messaging
- **iframe** (2w×2h): External website embeds
- **links** (2w×2h): Link collections
- **Rss** (3w×2h): RSS feed readers
- **Swap** (3w×3h): Token trading widgets
- **Portfolio** (3w×3h): Crypto portfolio tracking
- **Market** (3w×2h): Market data displays
- **governance** (4w×3h): DAO proposals/voting
- **SnapShot** (4w×3h): Snapshot governance

## DESIGN CONSTRAINTS
- Grid is exactly 12 columns wide × 8 rows tall (12×8 = 96 total cells)
- **CRITICAL**: Design must utilize at least 70% of the grid space (67+ cells out of 96)
- Each fidget must meet minimum size requirements
- Distribute fidgets to fill the entire 8-row height
- Avoid empty spaces - use the full 12×8 grid area
- Prioritize user experience and logical content flow
- Place most important content in top-left area
- Group related fidgets together
- Consider both desktop and mobile viewing

## REQUIRED OUTPUT FORMAT - SIMPLE MATRIX
You MUST respond with a simple JSON matrix format:

{
  "width": 12,
  "height": 8,
  "cells": [
    ["welcome", "welcome", "welcome", "welcome", "welcome", "welcome", "feed", "feed", "feed", "feed", "feed", "feed"],
    ["welcome", "welcome", "welcome", "welcome", "welcome", "welcome", "feed", "feed", "feed", "feed", "feed", "feed"],
    ["links", "links", "gallery", "gallery", "chat", "chat", "chat", null, null, null, null, null],
    // ... 8 rows total
  ],
  "fidgets": [
    {
      "id": "welcome",
      "type": "text",
      "purpose": "Welcome message for community",
      "priority": "high",
      "settings": {
        "title": "Welcome to Dog Lovers",
        "text": "Join our community of dog enthusiasts!",
        "fontColor": "var(--user-theme-font-color)"
      }
    },
    {
      "id": "feed",
      "type": "feed",
      "purpose": "Community social feed",
      "priority": "high",
      "settings": {
        "feedType": "farcaster",
        "feedFilter": "dogs",
        "title": "Dog Community Feed"
      }
    }
  ],
  "rationale": "Brief explanation of design choices and layout reasoning"
}

## DESIGN BEST PRACTICES
1. Start with a welcome text fidget
2. Include social feeds for community content
3. Add links for important resources
4. Use galleries for visual appeal
5. Consider adding chat for community interaction
6. Ensure mobile-friendly layouts (avoid too many small fidgets)
7. **CRITICAL**: Use validate_matrix_design tool to ensure complete grid coverage

## MATRIX RULES
- Each cell in the matrix contains either a fidget ID or null
- Fidgets are represented by rectangular regions of the same ID
- The builder will convert this matrix into the final JSON configuration
- Keep it simple - just specify which fidget goes where

Create a cohesive, user-friendly design matrix that maximally utilizes the available grid space.`;

// Matrix design validation tool - fast and simple
export const validateMatrixDesign = tool(
  async ({ data }: { data: string }) => {
    try {
      const parsed = JSON.parse(data) as DesignMatrix;
      
      if (!parsed.width || !parsed.height || !parsed.cells || !parsed.fidgets || !parsed.rationale) {
        return "❌ Invalid matrix format. Missing required fields: width, height, cells, fidgets, rationale.";
      }
      
      const GRID_WIDTH = 12;
      const GRID_HEIGHT = 8;
      const TOTAL_CELLS = GRID_WIDTH * GRID_HEIGHT;
      
      // Validate grid dimensions
      if (parsed.width !== GRID_WIDTH || parsed.height !== GRID_HEIGHT) {
        return `❌ Invalid grid dimensions: ${parsed.width}×${parsed.height}. Must be ${GRID_WIDTH}×${GRID_HEIGHT}.`;
      }
      
      // Validate matrix structure
      if (parsed.cells.length !== GRID_HEIGHT) {
        return `❌ Matrix has ${parsed.cells.length} rows, expected ${GRID_HEIGHT}.`;
      }
      
      for (let i = 0; i < parsed.cells.length; i++) {
        const row = parsed.cells[i];
        if (!row || row.length !== GRID_WIDTH) {
          return `❌ Row ${i} has ${row?.length || 0} columns, expected ${GRID_WIDTH}.`;
        }
      }
      
      // Extract fidget regions and validate
      const fidgetRegions = new Map<string, { minX: number, maxX: number, minY: number, maxY: number }>();
      const fidgetIds = new Set<string>();
      let occupiedCells = 0;
      
      for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
          const row = parsed.cells[y];
          if (!row) continue;
          const cellValue = row[x];
          if (cellValue) {
            occupiedCells++;
            fidgetIds.add(cellValue);
            
            if (!fidgetRegions.has(cellValue)) {
              fidgetRegions.set(cellValue, { minX: x, maxX: x, minY: y, maxY: y });
            } else {
              const region = fidgetRegions.get(cellValue)!;
              region.minX = Math.min(region.minX, x);
              region.maxX = Math.max(region.maxX, x);
              region.minY = Math.min(region.minY, y);
              region.maxY = Math.max(region.maxY, y);
            }
          }
        }
      }
      
      // Validate that all fidgets in the spec exist in the matrix
      const specFidgetIds = new Set(parsed.fidgets.map(f => f.id));
      for (const fidgetId of fidgetIds) {
        if (!specFidgetIds.has(fidgetId)) {
          return `❌ Fidget "${fidgetId}" found in matrix but not in fidgets spec.`;
        }
      }
      
      // Validate fidget minimum sizes
      for (const [fidgetId, region] of fidgetRegions) {
        const fidgetSpec = parsed.fidgets.find(f => f.id === fidgetId);
        if (!fidgetSpec) continue;
        
        const width = region.maxX - region.minX + 1;
        const height = region.maxY - region.minY + 1;
        const minSize = FIDGET_MIN_SIZES[fidgetSpec.type as keyof typeof FIDGET_MIN_SIZES];
        
        if (minSize && (width < minSize.width || height < minSize.height)) {
          return `❌ Fidget "${fidgetId}" size ${width}×${height} is below minimum ${minSize.width}×${minSize.height}.`;
        }
        
        // Validate fidget forms a proper rectangle
        for (let y = region.minY; y <= region.maxY; y++) {
          for (let x = region.minX; x <= region.maxX; x++) {
            const row = parsed.cells[y];
            if (!row || row[x] !== fidgetId) {
              return `❌ Fidget "${fidgetId}" doesn't form a proper rectangle at (${x}, ${y}).`;
            }
          }
        }
      }
      
      // Calculate coverage
      const coveragePercentage = (occupiedCells / TOTAL_CELLS) * 100;
      
      if (coveragePercentage < 60) {
        return `❌ Coverage too low: ${coveragePercentage.toFixed(1)}% (target: 70%+). Fill more cells.`;
      }
      
      if (coveragePercentage < 70) {
        const needed = Math.ceil(TOTAL_CELLS * 0.70) - occupiedCells;
        return `⚠️ Coverage: ${coveragePercentage.toFixed(1)}%. Add ~${needed} more cells to reach 70% target.`;
      }
      
      return `✅ Matrix design valid: ${coveragePercentage.toFixed(1)}% coverage, ${fidgetIds.size} fidgets, proper rectangles.`;
      
    } catch (error) {
      return `❌ JSON parsing error: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  {
    name: "validate_matrix_design",
    description: "Fast validation of matrix design format and coverage",
    schema: z.object({ data: z.string() })
  }
);

// Grid utilization validator - ensures complete grid coverage (OPTIMIZED)
// REMOVED: validateGridUtilization - replaced with validateMatrixDesign

// Configuration grid utilization validator - analyzes final space configurations (OPTIMIZED)
export const validateConfigGridUtilization = tool(
  async ({ data }: { data: string }) => {
    try {
      let config;
      
      // Simplified JSON parsing - try direct first, then unescape if needed
      try {
        config = JSON.parse(data);
      } catch (firstError) {
        const unescapedData = data.replace(/\\\"/g, '"').replace(/\\\\/g, '\\');
        try {
          config = JSON.parse(unescapedData);
        } catch (secondError) {
          // Quick truncation check
          if (data.includes('{') && !data.trim().endsWith('}')) {
            return `❌ Configuration JSON is truncated. Please ensure complete JSON is passed.`;
          }
          return `❌ JSON parsing failed. Please check JSON formatting.`;
        }
      }
      
      if (!config.layoutDetails?.layoutConfig?.layout) {
        return "❌ Invalid configuration format. Missing layout details.";
      }

      const GRID_WIDTH = 12;
      const GRID_HEIGHT = 8;
      const TOTAL_CELLS = GRID_WIDTH * GRID_HEIGHT;
      
      let occupiedCells = 0;
      let maxRowUsed = 0;
      let maxColUsed = 0;
      const layoutItems = config.layoutDetails.layoutConfig.layout;
      
      // Simple cell counting without complex region analysis
      for (const item of layoutItems) {
        const { x, y, w: width, h: height } = item;
        
        // Bounds check
        if (x < 0 || y < 0 || x + width > GRID_WIDTH || y + height > GRID_HEIGHT) {
          return `❌ ${item.i} exceeds grid bounds: (${x},${y}) ${width}×${height}`;
        }
        
        occupiedCells += width * height;
        maxRowUsed = Math.max(maxRowUsed, y + height);
        maxColUsed = Math.max(maxColUsed, x + width);
      }
      
      const coveragePercentage = (occupiedCells / TOTAL_CELLS) * 100;
      
      // Quick assessment without expensive region finding
      let result = `Grid Analysis: ${coveragePercentage.toFixed(1)}% coverage (${occupiedCells}/${TOTAL_CELLS} cells)\n`;
      
      if (coveragePercentage >= 75) {
        result += `✅ GOOD: Grid utilization meets target (${coveragePercentage.toFixed(1)}%)`;
        if (maxRowUsed < GRID_HEIGHT) {
          result += `\n💡 Could extend to row ${GRID_HEIGHT - 1} for even better utilization`;
        }
      } else {
        result += `⚠️  NEEDS IMPROVEMENT: ${coveragePercentage.toFixed(1)}% coverage (target: 75%+)\n`;
        result += `� Using ${maxRowUsed}/${GRID_HEIGHT} rows, ${maxColUsed}/${GRID_WIDTH} columns\n`;
        
        const missingCells = Math.ceil(TOTAL_CELLS * 0.75) - occupiedCells;
        if (missingCells > 0) {
          result += `💡 Add ~${missingCells} more cells of content to reach 75% target`;
        }
      }
      
      return result;
      
    } catch (error) {
      return `❌ Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  {
    name: "validate_config_grid_utilization",
    description: "Fast validation of configuration grid coverage and optimization suggestions",
    schema: z.object({ data: z.string() })
  }
);

// Create and export the designer agent
export function createDesignerAgent(llm: ChatOpenAI) {
  return createReactAgent({
    llm,
    tools: [validateMatrixDesign],
    name: "designer", 
    stateModifier: new SystemMessage(DESIGNER_PROMPT),
  });
}
