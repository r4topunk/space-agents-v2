import { AIMessage, BaseMessage, isAIMessage } from "@langchain/core/messages";
import "cheerio";

export const prettyPrint = (message: BaseMessage | undefined) => {
  if (!message) {
    console.log("Undefined message...");
    return;
  }

  let txt = `[${message.getType()}]\n${message.content}`;
  if ((isAIMessage(message) && message.tool_calls?.length) || 0 > 0) {
    const tool_calls = (message as AIMessage)?.tool_calls
      ?.map((tc) => `- ${tc.name}(${JSON.stringify(tc.args)})`)
      .join("\n");
    txt += `Tool calls: \n${tool_calls}`;
  }
  console.log(txt);
};
