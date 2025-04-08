import { GoogleGenerativeAI } from "@google/generative-ai";
// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(
  ""
);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function analyzeSentiment(text: string) {
  const prompt = `
    Analyze the sentiment of the following text and respond with a JSON object with these fields:
    - sentiment: either "positive", "negative", or "neutral"
    - score: a number between -1 (very negative) and 1 (very positive)
    - emoji: an appropriate emoji that represents the sentiment
    - color: a hex color code that represents the sentiment (green for positive, red for negative, gray for neutral)
    
    Text to analyze: "${text}"
  `;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Extract the JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("Failed to parse sentiment analysis result");
    }
  } catch (error) {
    console.error("Error analyzing sentiment:", error);
    return {
      sentiment: "neutral",
      emoji: "😐",
      color: "#888888",
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}