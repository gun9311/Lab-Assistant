require('dotenv').config();
const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const getNLPResponse = async (messages) => {
  try {
    // 간결한 응답 요청을 한국어로 추가
    messages.unshift({ role: 'system', content: '간결하고 짧은 응답을 제공해 주세요.' });

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: messages,
      max_tokens: 300, // 토큰 수를 줄여 응답을 간결하게 제한
      temperature: 0.7,
    });

    let responseText = response.choices[0].message.content;

    // 마지막 완전한 문장까지만 자르기
    const lastPeriodIndex = responseText.lastIndexOf('.');
    if (lastPeriodIndex !== -1) {
      responseText = responseText.slice(0, lastPeriodIndex + 1);
    }

    return responseText;
  } catch (error) {
    console.error('Error in getNLPResponse:', error);
    throw new Error('Failed to get response from OpenAI API');
  }
};

module.exports = { getNLPResponse };
