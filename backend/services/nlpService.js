require("dotenv").config();
const { OpenAI } = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const getNLPResponse = async function* (messages) {
  // console.log("[nlpService] Starting getNLPResponse");
  try {
    // messages.unshift({  // 이 부분을 삭제합니다.
    //   role: "system",
    //   content:
    //     "명확하고 이해하기 쉬운 설명을 제공하되, 너무 길어지지 않도록 핵심 내용을 중심으로 답변하세요.",
    // });
    // console.log(
    //   "[nlpService] Messages received:",
    //   JSON.stringify(messages, null, 2)
    // );

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-nano",
      messages: messages, // 전달받은 messages를 그대로 사용합니다.
      stream: true,
      max_tokens: 500,
      temperature: 0.7,
    });

    //console.log("[nlpService] OpenAI stream initiated");
    let chunkCounter = 0;

    for await (const chunk of response) {
      const delta = chunk.choices[0].delta;

      if (delta && delta.content) {
        chunkCounter++;
        // console.log(
        //   `[nlpService] Yielding chunk ${chunkCounter}:`,
        //   delta.content
        // );
        yield delta.content;
      }
      // if (chunk.choices[0].finish_reason) {
      //   // console.log(
      //   //   "[nlpService] Stream finish reason:",
      //   //   chunk.choices[0].finish_reason
      //   // );
      // }
    }
    // console.log("[nlpService] Stream finished");
  } catch (error) {
    console.error("[nlpService] Error in getNLPResponse:", error);
    throw error;
  }
};

module.exports = { getNLPResponse };
