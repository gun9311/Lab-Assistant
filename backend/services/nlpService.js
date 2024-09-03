require('dotenv').config();
const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const getNLPResponse = async function* (messages) {
  try {
    messages.unshift({ role: 'system', content: '간결하고 짧은 응답을 제공해 주세요.' });

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: messages,
      stream: true,
      max_tokens: 300,
      temperature: 0.7,
    });

    let accumulatedText = "";  // 누적된 텍스트를 저장할 변수
    let buffer = [];  // 청크를 저장할 배열

    // 문장 끝을 확인하는 정규 표현식에 이모지 및 특수 문자를 포함
    const sentenceEndRegex = /([.?!]|[😊👍😉❤️🎉✨…—*📚✏️📝📖🧑‍🏫🧑‍🎓🎓📅⏰📊💡📐🔍💻🎒👏💪🌟🏆🤓😊🙌🙏🤔😃😅😴😮🤯])\s*$/g;

    for await (const chunk of response) {
      const delta = chunk.choices[0].delta;

      if (delta && delta.content) {
        accumulatedText += delta.content;
        buffer.push(delta.content);  // 청크를 버퍼에 추가

        // 문장의 끝을 구두점과 이모지 및 특수 문자로 확인
        if (accumulatedText.match(sentenceEndRegex)) {
          // 타이핑 효과를 위해 각 청크를 일정 간격으로 전송
          for (const bufferedChunk of buffer) {
            yield bufferedChunk;
            await new Promise(resolve => setTimeout(resolve, 100));  // 100ms 간격으로 청크 전송
          }
          buffer = [];  // 버퍼 초기화
          accumulatedText = "";  // 누적된 텍스트 초기화
        }
      }

      // 스트리밍 종료 시점 처리
      if (chunk.choices[0].finish_reason === 'stop') {
        // 스트리밍이 종료된 후, 남아 있는 불완전한 청크들을 일정 간격으로 전송
        for (const bufferedChunk of buffer) {
          yield bufferedChunk;
          await new Promise(resolve => setTimeout(resolve, 50));  // 100ms 간격으로 청크 전송
        }
        break; // 스트리밍 종료
      }
    }
  } catch (error) {
    console.error('Error in getNLPResponse:', error);
    throw new Error('Failed to get response from OpenAI API');
  }
};

module.exports = { getNLPResponse };
