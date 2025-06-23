import { createNounspace } from "./index";
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
    
    // Look through all messages to find the JSON configuration
    let jsonConfig = null;
    let foundInMessage = -1;
    
    for (let i = result.length - 1; i >= 0; i--) {
      const message = result[i];
      if (message && message.content) {
        const content = typeof message.content === 'string' 
          ? message.content 
          : JSON.stringify(message.content);
          
        // Look for JSON in the message (between ``` blocks or as plain text)
        const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || 
                         content.match(/(\{[\s\S]*\})/);
        
        if (jsonMatch && jsonMatch[1]) {
          try {
            jsonConfig = JSON.parse(jsonMatch[1]);
            foundInMessage = i;
            break;
          } catch (parseError) {
            // Continue searching other messages
          }
        }
      }
    }
    
    if (jsonConfig) {
      console.log("\n📄 Final Configuration:");
      console.log(`=====================================`);
      console.log(`Found JSON in message ${foundInMessage + 1}/${result.length}`);
      console.log(JSON.stringify(jsonConfig, null, 2));
      
      // Save to file for easy access
      const outputPath = join(process.cwd(), "generated-config.json");
      writeFileSync(outputPath, JSON.stringify(jsonConfig, null, 2));
      console.log(`\n💾 Configuration saved to: ${outputPath}`);
    } else {
      console.log("\n⚠️  No JSON configuration found in any message");
      console.log("\nLast few messages:");
      for (let i = Math.max(0, result.length - 3); i < result.length; i++) {
        const message = result[i];
        if (message) {
          const content = typeof message.content === 'string' 
            ? message.content 
            : JSON.stringify(message.content);
          console.log(`\n--- Message ${i + 1} ---`);
          console.log(content);
        }
      }
    }
    
  } catch (error) {
    console.error("❌ Error during nounspace creation:", error);
  }
}

// Uncomment to run the test
testNounspaceCreation();

export { testNounspaceCreation };
