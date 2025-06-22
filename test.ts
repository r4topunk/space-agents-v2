import { createNounspace } from "./agents/example";
import { writeFileSync } from "fs";
import { join } from "path";

// Test the improved nounspace creation system
async function testNounspaceCreation() {
  try {
    console.log("🚀 Starting nounspace creation test...\n");
    
    const userRequest = "Create a nounspace for a community of crypto traders who want to track their portfolios, share trading insights, and stay updated with market news";
    
    const result = await createNounspace(userRequest);
    
    console.log("✅ Nounspace creation completed successfully!");
    console.log(`📊 Generated ${result.length} messages in the workflow`);
    
    // Extract the final configuration from the last AI message
    const lastMessage = result[result.length - 1];
    if (lastMessage && lastMessage.content) {
      console.log("\n📄 Final Configuration:");
      console.log("=====================================");
      
      // Try to extract JSON from the message content
      const content = typeof lastMessage.content === 'string' 
        ? lastMessage.content 
        : JSON.stringify(lastMessage.content);
      let jsonConfig = null;
      
      // Look for JSON in the message (between ``` blocks or as plain text)
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || 
                       content.match(/(\{[\s\S]*\})/);
      
      if (jsonMatch && jsonMatch[1]) {
        try {
          jsonConfig = JSON.parse(jsonMatch[1]);
          console.log(JSON.stringify(jsonConfig, null, 2));
          
          // Save to file for easy access
          const outputPath = join(process.cwd(), "generated-config.json");
          writeFileSync(outputPath, JSON.stringify(jsonConfig, null, 2));
          console.log(`\n💾 Configuration saved to: ${outputPath}`);
          
        } catch (parseError) {
          console.log("Raw content from last message:");
          console.log(content);
          console.log("\n⚠️  Could not parse JSON from the message content");
        }
      } else {
        console.log("Raw content from last message:");
        console.log(content);
        console.log("\n⚠️  No JSON configuration found in the message");
      }
    }
    
  } catch (error) {
    console.error("❌ Error during nounspace creation:", error);
  }
}

// Uncomment to run the test
testNounspaceCreation();

export { testNounspaceCreation };
