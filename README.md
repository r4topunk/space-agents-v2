# Space Agents V2 - High-Performance Blank Space Builder

A sophisticated multi-agent system for automatically generating space configurations for the Blank Space platform using LangChain and OpenAI.

## 🏗️ Architecture

The system uses a **supervised multi-agent architecture** with three specialized agents:

1. **🔍 Researcher Agent**: Gathers comprehensive information about the requested community/topic
2. **🎨 Designer Agent**: Creates optimal grid layouts using available fidgets (widgets)  
3. **⚙️ Builder Agent**: Generates final JSON configuration for the space

## 🚀 Key Improvements (Best Practices Applied)

### 1. **Structured Output Formats**
- All agents use **strict JSON schemas** for consistent data exchange
- Clear input/output specifications reduce hallucinations
- Validation tools ensure data quality at each step

### 2. **Optimized Prompts**
- **Token-efficient** prompts with essential information only
- **Specific constraints** and validation rules
- **Clear examples** and templates for each agent
- **Consistent terminology** across all agents

### 3. **Type Safety & Validation**
- Full TypeScript type definitions in `/types/agentTypes.ts`
- Runtime validation tools for each agent's output
- Fidget size constraints and type validation
- Unique ID enforcement

### 4. **Performance Optimizations**
- Lower temperature (0.1) for consistent structured output
- Maximum token limits to prevent runaway generation
- Efficient prompt structure with minimal redundancy
- Parallel validation where possible

### 5. **Error Handling**
- Comprehensive error catching and reporting
- Validation at each agent handoff
- Clear error messages for debugging
- Graceful failure handling

## 📁 Project Structure

```
space-agents-v2/
├── agents/
│   └── example.ts           # Main agent implementation
├── utils/
│   ├── supervisorPrompts.ts # Optimized agent prompts
│   └── prettyPrint.ts       # Output formatting
├── types/
│   └── agentTypes.ts        # TypeScript definitions
├── test.ts                  # Testing utilities
└── README.md               # This file
```

## 🎯 Usage

```typescript
import { createSpace } from "./agents/example";

// Create a space with a descriptive request
const result = await createSpace(
  "Create a space for dog lovers who share photos and training tips"
);
```

## 🔧 Agent Specifications

### Researcher Agent
- **Input**: User request (natural language)
- **Output**: Structured JSON with research findings
- **Tools**: TavilySearch, validation
- **Focus**: Social accounts, keywords, resources, color schemes

### Designer Agent  
- **Input**: Research data JSON
- **Output**: Layout plan with fidget positioning
- **Tools**: Design validation
- **Focus**: Grid layout, fidget selection, user experience

### Builder Agent
- **Input**: Design plan JSON
- **Output**: Final space configuration JSON
- **Tools**: Configuration validation
- **Focus**: Proper JSON structure, settings validation

## 🎨 Available Fidgets

The system supports 16+ fidget types including:
- **Content**: text, gallery, Video, Rss
- **Social**: feed, cast, Chat, links  
- **Finance**: Swap, Portfolio, Market
- **Governance**: SnapShot, governance
- **Utility**: iframe, frame, FramesV2

Each fidget has specific minimum size requirements and configuration options.

## 🚀 Performance Features

- **Fast execution** with optimized prompts
- **Consistent results** through structured output
- **Error resilience** with validation at each step
- **Type safety** throughout the pipeline
- **Extensible architecture** for adding new fidgets

## 🧪 Testing

Run the test suite:

```bash
bun run test.ts
```

## 📊 Example Output

The system generates a complete space configuration like:

```json
[
  {
    "config": {
      "editable": true,
      "settings": {
        "title": "Welcome Dog Lovers!",
        "text": "Join our community of dog enthusiasts!"
      },
      "data": {}
    },
    "fidgetType": "text",
    "id": "text:welcome"
  }
  // ... more fidgets
]
```

This refactored system delivers **high-performance LLM interactions** with reliable, structured outputs for space generation on the Blank Space platform.

## Installation & Setup

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.2.5. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
