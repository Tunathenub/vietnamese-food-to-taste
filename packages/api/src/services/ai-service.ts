import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey });

export async function analyzeNationalityTaste(nationality: string) {
  const prompt = `
You are a culinary AI expert for a Vietnamese restaurant.
The user's nationality or cultural background is: "${nationality}".

Please output a JSON object representing their general taste profile and dietary restrictions based on common demographics for that nationality/region.
The JSON must follow this exact structure:
{
  "tastePreferences": {
    "spice_level": 0-5, // 0 = no spice, 5 = extremely spicy
    "sweetness": 0-5,
    "sourness": 0-5,
    "fish_sauce_intensity": 0-5,
    "herb_intensity": 0-5,
    "oil_richness": 0-5
  },
  "dietaryRestrictions": [
    // Array of string enums for common religious/cultural restrictions. 
    // E.g., "NO_BEEF" (Hindu), "NO_PORK" (Islam), "HALAL", "VEGAN", etc. 
    // Leave empty [] if no major universal restrictions apply.
  ]
}
Return ONLY valid JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No response from AI");
    
    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Error calling Gemini AI:', error);
    // Fallback default
    return {
      tastePreferences: {
        spice_level: 2,
        sweetness: 3,
        sourness: 2,
        fish_sauce_intensity: 2,
        herb_intensity: 2,
        oil_richness: 3
      },
      dietaryRestrictions: []
    };
  }
}
