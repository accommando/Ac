import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ 
  apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || '' 
});

export const campaignModel = "gemini-3-flash-preview";
export const imageModel = "gemini-2.5-flash-image";

export async function generateCampaignContent(prompt: string) {
  const result = await ai.models.generateContent({
    model: campaignModel,
    contents: `Generate a professional email marketing campaign based on this prompt: "${prompt}". 
    The output should include a catchy subject line and a compelling body copy with placeholders like [Link] or [Name].
    Return as a JSON object with 'subject' and 'body' fields.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          subject: { type: Type.STRING },
          body: { type: Type.STRING }
        },
        required: ["subject", "body"]
      }
    }
  });

  return JSON.parse(result.text);
}

export async function generateCampaignImage(prompt: string) {
  const result = await ai.models.generateContent({
    model: imageModel,
    contents: {
      parts: [
        { text: `Create a professional, modern, and eye-catching marketing visual for an email campaign based on this prompt: "${prompt}". The style should be clean, high-quality, and visually appealing.` }
      ]
    },
    config: {
      imageConfig: {
        aspectRatio: "16:9",
        imageSize: "1K"
      }
    }
  });

  for (const part of result.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
}
