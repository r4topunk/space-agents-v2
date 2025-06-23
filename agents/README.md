# Agents Directory

This directory contains the modular agent architecture for the space creation system on the Blank Space platform. Each agent is now in its own file with its specific prompt and tools included.

## File Structure

### Individual Agent Files
- **`researcher.ts`** - Research agent with prompt and validation tools
  - Handles information gathering using Tavily search
  - Validates research output format
  - Exports `createResearcherAgent()` function

- **`designer.ts`** - Design agent with prompt and validation tools
  - Creates layout plans with grid coverage optimization
  - Validates design constraints and space utilization
  - Exports `createDesignerAgent()` function

- **`builder.ts`** - Builder agent with prompt and validation tools
  - Converts design plans to complete space configurations
  - Validates design implementation fidelity
  - Exports `createBuilderAgent()` function

- **`supervisor.ts`** - Supervisor workflow configuration
  - Orchestrates the three agents
  - Contains the supervisor prompt
  - Exports `createSupervisorWorkflow()` function

### Legacy Files
- **`example.ts`** - Legacy monolithic implementation (kept for reference)

## Usage

### New Modular Approach (Recommended)
```typescript
import { createSpace } from "../index";

const result = await createSpace("Create a space for dog lovers");
```

### Direct Agent Usage
```typescript
import { ChatOpenAI } from "@langchain/openai";
import { createSupervisorWorkflow } from "./agents/supervisor";

const llm = new ChatOpenAI({ model: "gpt-4o" });
const workflow = createSupervisorWorkflow(llm);
const app = workflow.compile();
```

## Benefits of Modular Architecture

1. **Separation of Concerns** - Each agent has its own file with related prompts and tools
2. **Maintainability** - Easier to update individual agent logic without affecting others
3. **Reusability** - Agents can be imported and used independently
4. **Testing** - Individual agents can be tested in isolation
5. **Code Organization** - Clear structure with related functionality grouped together

## Prompts Location

All prompts are now co-located with their respective agents:
- `RESEARCHER_PROMPT` in `researcher.ts`
- `DESIGNER_PROMPT` in `designer.ts`  
- `BUILDER_PROMPT` in `builder.ts`
- `SUPERVISOR_PROMPT` in `supervisor.ts`

This eliminates the need for the separate `utils/supervisorPrompts.ts` file and keeps related functionality together.
