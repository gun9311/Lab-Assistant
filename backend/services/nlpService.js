require("dotenv").config();
// const { OpenAI } = require("openai"); // OpenAI SDK 주석 처리
const Anthropic = require("@anthropic-ai/sdk"); // Anthropic SDK 가져오기
const config = require("../config"); // 설정 파일 로드

// const openai = new OpenAI({ // OpenAI 클라이언트 초기화 주석 처리
//   apiKey: process.env.OPENAI_API_KEY,
// });
const anthropic = new Anthropic({
  // Anthropic 클라이언트 초기화
  apiKey: process.env.ANTHROPIC_API_KEY, // .env 파일에서 API 키를 읽어옴
});

const getNLPResponse = async function* (systemPrompt, userMessages) {
  // console.log("[nlpService] Starting getNLPResponse with Anthropic");
  try {
    // Claude는 messages 배열에 system 역할을 포함하지 않고,
    // create 메서드의 system 파라미터로 전달하는 것을 권장합니다.
    // messages 배열에서 system 메시지를 분리해야 할 수 있습니다.
    // 우선은 messages가 user/assistant 턴으로만 구성되어 있다고 가정하고 진행합니다.
    // 이 부분은 chatbotInteractionService.js 와 함께 검토 필요.

    // console.log(
    //   "[nlpService] Messages for Anthropic:",
    //   JSON.stringify(messages, null, 2)
    // );

    const stream = await anthropic.messages.stream({
      // anthropic.messages.stream 사용
      model: config.anthropicAI.MODEL, // config.js에서 anthropicAI 설정 사용
      system: systemPrompt, // 분리된 시스템 프롬프트 사용
      messages: userMessages, // 사용자/어시스턴트 메시지만 포함
      max_tokens: config.anthropicAI.MAX_TOKENS, // config.js에서 설정한 값
      temperature: config.anthropicAI.TEMPERATURE, // config.js에서 설정한 값
      // Claude API는 system prompt를 별도로 받을 수 있습니다.
      // messages 배열의 첫 번째가 system 역할이라면 분리해서 아래와 같이 전달해야 합니다.
      // system: messages[0].role === 'system' ? messages.shift().content : undefined,
      // messages: messages (이렇게 하면 messages 배열은 user/assistant만 남게 됨)
      // 이 부분은 다음 단계에서 chatbotInteractionService.js와 함께 조정하겠습니다.
    });

    // console.log("[nlpService] Anthropic stream initiated");
    // let chunkCounter = 0;

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta &&
        event.delta.type === "text_delta"
      ) {
        // chunkCounter++;
        // console.log(
        //   `[nlpService] Yielding Anthropic chunk ${chunkCounter}:`,
        //   event.delta.text
        // );
        yield event.delta.text;
      }
      // 다른 이벤트 타입 (예: message_start, message_delta, message_stop, content_block_stop 등)도
      // 필요에 따라 처리할 수 있습니다.
      // if (event.type === 'message_stop') {
      //   // console.log("[nlpService] Anthropic stream finished");
      // }
    }
  } catch (error) {
    console.error("[nlpService] Error in getNLPResponse (Anthropic):", error);
    // Anthropic API 에러 객체 구조에 따라 에러 메시지를 좀 더 상세히 로깅할 수 있습니다.
    if (error instanceof Anthropic.APIError) {
      console.error("Anthropic API Error Details:", {
        status: error.status,
        headers: error.headers,
        name: error.name,
        message: error.message,
      });
    }
    throw error; // 에러를 다시 throw하여 호출한 쪽에서 처리할 수 있도록 함
  }
};

module.exports = { getNLPResponse };
