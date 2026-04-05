import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
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
              model: 'gpt-4o-mini',
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
