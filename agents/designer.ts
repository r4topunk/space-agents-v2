import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage } from "@langchain/core/messages";
import { 
  VALID_FIDGET_TYPES, 
  FIDGET_MIN_SIZES,
  type DesignPlan
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
- Grid is exactly 12 columns wide × 10 rows tall (12×10 = 120 total cells)
- **CRITICAL**: Design must utilize at least 70% of the grid space (84+ cells out of 120)
- Each fidget must meet minimum size requirements
- Distribute fidgets to fill the entire 10-row height
- Avoid empty spaces - use the full 12×10 grid area
- Prioritize user experience and logical content flow
- Place most important content in top-left area
- Group related fidgets together
- Consider both desktop and mobile viewing

## GRID COVERAGE REQUIREMENTS
- Target grid: 12 columns × 10 rows = 120 total cells
- Minimum coverage: 70% (84 cells)
- Optimal coverage: 80%+ (96+ cells)
- Ensure fidgets extend through most of the 10 rows
- Balance fidget sizes to maximize space utilization
- Aim for 5-10 fidgets for optimal layout density

## REQUIRED OUTPUT FORMAT
You MUST respond with a JSON object:
{
  "fidgets": [
    {
      "id": "text:welcome",
      "type": "text",
      "position": {"x": 0, "y": 0, "width": 6, "height": 2},
      "settings": {
        "title": "Welcome to Dog Lovers",
        "text": "Join our community of dog enthusiasts!",
        "fontColor": "#333333"
      }
    }
  ],
  "gridLayout": [
    ["text:welcome", "text:welcome", "text:welcome", "text:welcome", "text:welcome", "text:welcome", "feed:dogs", "feed:dogs", "feed:dogs", "feed:dogs", "feed:dogs", "feed:dogs"],
    ["text:welcome", "text:welcome", "text:welcome", "text:welcome", "text:welcome", "text:welcome", "feed:dogs", "feed:dogs", "feed:dogs", "feed:dogs", "feed:dogs", "feed:dogs"],
    ["links:social", "links:social", "gallery:hero", "gallery:hero", "Chat:community", "Chat:community", "Chat:community", null, null, null, null, null]
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
7. **CRITICAL**: Use validate_grid_utilization tool to ensure complete grid coverage

## VALIDATION WORKFLOW
1. Create your design plan following the required JSON format
2. Use validate_design for basic validation (format, constraints, minimum coverage)
3. Use validate_grid_utilization for detailed grid analysis and optimization suggestions
4. Iterate based on validation feedback until achieving 75%+ grid coverage

Create a cohesive, user-friendly design that maximally utilizes the available grid space.`;

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

// Grid utilization validator - ensures complete grid coverage (OPTIMIZED)
export const validateGridUtilization = tool(
  async ({ data }: { data: string }) => {
    try {
      let parsed: DesignPlan;
      
      // Simplified JSON parsing
      try {
        parsed = JSON.parse(data) as DesignPlan;
      } catch (firstError) {
        const unescapedData = data.replace(/\\\"/g, '"').replace(/\\\\/g, '\\');
        try {
          parsed = JSON.parse(unescapedData) as DesignPlan;
        } catch (secondError) {
          if (data.includes('{') && !data.trim().endsWith('}')) {
            return `❌ Design plan JSON is truncated. Please ensure complete JSON is passed.`;
          }
          return `❌ JSON parsing failed. Please check JSON formatting.`;
        }
      }
      
      if (!parsed.fidgets) {
        return "❌ Invalid design format. Missing fidgets array.";
      }

      const GRID_WIDTH = 12;
      const GRID_HEIGHT = 8;
      const TOTAL_CELLS = GRID_WIDTH * GRID_HEIGHT;
      
      let occupiedCells = 0;
      let maxRowUsed = 0;
      
      // Simple validation without complex region analysis
      for (const fidget of parsed.fidgets) {
        const { x, y, width, height } = fidget.position;
        
        // Bounds check
        if (x < 0 || y < 0 || x + width > GRID_WIDTH || y + height > GRID_HEIGHT) {
          return `❌ ${fidget.id} exceeds grid bounds: (${x},${y}) ${width}×${height}`;
        }
        
        // Minimum size check
        const minSize = FIDGET_MIN_SIZES[fidget.type as keyof typeof FIDGET_MIN_SIZES];
        if (minSize && (width < minSize.width || height < minSize.height)) {
          return `❌ ${fidget.id} too small: ${width}×${height} (min: ${minSize.width}×${minSize.height})`;
        }
        
        occupiedCells += width * height;
        maxRowUsed = Math.max(maxRowUsed, y + height);
      }
      
      const coveragePercentage = (occupiedCells / TOTAL_CELLS) * 100;
      
      // Quick assessment
      if (coveragePercentage < 60) {
        return `❌ Coverage too low: ${coveragePercentage.toFixed(1)}% (target: 75%+). Add more fidgets.`;
      }
      
      if (maxRowUsed < GRID_HEIGHT - 1) {
        return `⚠️  Using only ${maxRowUsed}/${GRID_HEIGHT} rows. Extend layout to use full height.`;
      }
      
      if (coveragePercentage < 75) {
        const needed = Math.ceil(TOTAL_CELLS * 0.75) - occupiedCells;
        return `⚠️  ${coveragePercentage.toFixed(1)}% coverage. Add ~${needed} more cells to reach 75% target.`;
      }
      
      return `✅ Grid utilization excellent: ${coveragePercentage.toFixed(1)}% coverage, using ${maxRowUsed}/${GRID_HEIGHT} rows`;
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return `❌ Error: ${errorMsg}`;
    }
  },
  {
    name: "validate_grid_utilization",
    description: "Fast validation of design plan grid coverage with optimization suggestions",
    schema: z.object({ data: z.string() })
  }
);

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
    tools: [validateDesign, validateGridUtilization],
    name: "designer", 
    stateModifier: new SystemMessage(DESIGNER_PROMPT),
  });
}
