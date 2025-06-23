import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage } from "@langchain/core/messages";
import { TavilySearch } from "@langchain/tavily";
import { type ResearchData } from "../types/agentTypes";

// Researcher prompt
export const RESEARCHER_PROMPT = `You are a research expert specialized in gathering information for space creation on the Blank Space platform.

## YOUR ROLE
Research the user's request and gather comprehensive information needed to build a relevant space for their community or project.

## REQUIRED OUTPUT FORMAT
You MUST respond with a JSON object containing exactly these fields:
{
  "summary": "Brief 2-3 sentence summary of the community/topic",
  "keyTopics": ["topic1", "topic2", "topic3"],
  "socialAccounts": {
    "farcaster": ["@username1", "@username2"],
    "twitter": ["@handle1", "@handle2"]
  },
  "relevantLinks": [
    {"title": "Website Name", "url": "https://example.com", "type": "official"},
    {"title": "Resource Name", "url": "https://example.com", "type": "resource"}
  ],
  "contentSuggestions": [
    {"type": "feed", "source": "farcaster", "filter": "keyword", "value": "dogs"},
    {"type": "links", "purpose": "social", "content": "community links"},
    {"type": "text", "purpose": "welcome", "content": "welcome message"}
  ],
  "colors": {
    "primary": "#hex",
    "secondary": "#hex"
  }
}

## RESEARCH PRIORITIES
1. Find official social media accounts and communities
2. Identify key topics, hashtags, and keywords
3. Locate relevant websites, resources, and tools
4. Understand the community's interests and needs
5. Suggest appropriate content types for the space

Be thorough but concise. Focus on actionable information that will help create an engaging space for the Blank Space platform.`;

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

// Create and export the researcher agent
export function createResearcherAgent(llm: ChatOpenAI) {
  return createReactAgent({
    llm,
    tools: [new TavilySearch(), validateResearch],
    name: "researcher",
    stateModifier: new SystemMessage(RESEARCHER_PROMPT),
  });
}
