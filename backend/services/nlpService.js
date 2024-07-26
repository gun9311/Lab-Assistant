require('dotenv').config();
const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const getNLPResponse = async (messages) => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: messages,
      max_tokens: 300,
      temperature: 0.7,
    });

    const responseText = response.choices[0].message.content;

    return responseText;
  } catch (error) {
    console.error('Error in getNLPResponse:', error);
    throw new Error('Failed to get response from OpenAI API');
  }
};

module.exports = { getNLPResponse };
