import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// Uses Groq (free tier) via OpenAI-compatible API — no billing required.
// Get a free key at https://console.groq.com and set GROQ_API_KEY in Railway.
const openai = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
});

export const generateResponse = async (
      userQuery: string,
      relevantSummaries: string[]
    ): Promise<string> => {
      const context = relevantSummaries
        .map((s, i) => `[Article ${i + 1}]: ${s}`)
        .join('\n\n');

      const systemPrompt = `You are a knowledgeable financial news assistant specializing in S&P 500 stocks and market analysis.
      Your job is to answer questions about stocks, market trends, and financial news based on the provided context articles.
      Always be concise, accurate, and cite specific details from the articles when available.
      If the context doesn't contain enough information to answer fully, say so clearly.`;

      const userPrompt = `User question: ${userQuery}

      Relevant news articles for context:
      ${context}

      Please provide a clear, helpful answer based on the articles above.`;

      const completion = await openai.chat.completions.create({
              model: 'llama-3.1-8b-instant',
              messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: userPrompt },
                      ],
              max_tokens: 600,
              temperature: 0.3,
      });

      const aiResponse = completion.choices[0].message?.content || 'I was unable to generate a response.';
      return aiResponse;
};
