import { GoogleGenAI } from "@google/genai";

// Using the mapped model name for 'nano banana' / 'gemini flash image'
const MODEL_NAME = 'gemini-2.5-flash-image';

export async function generateImageFromSketch(prompt: string, imageBase64: string): Promise<string> {
  // 1. Initialize the client
  // API Key is guaranteed to be in process.env.API_KEY per instructions
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    // 2. Prepare the content parts
    // The model accepts text and images to guide generation/editing.
    const parts = [
      {
        text: prompt || "Enhance this image.",
      },
      {
        inlineData: {
          mimeType: 'image/png',
          data: imageBase64,
        },
      },
    ];

    // 3. Call generateContent
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: parts,
      },
      // Config specific to image tasks if needed, though defaults work well for general 'render this' tasks.
      config: {
        // systemInstruction: "You are an expert artist. Transform the provided sketch into a finished masterpiece.",
      }
    });

    // 4. Extract the image from the response
    // The response might contain text (if it failed to gen image or just chatted) or inlineData (the image).
    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64Data = part.inlineData.data;
          return `data:image/png;base64,${base64Data}`;
        }
      }
    }

    throw new Error("No image data found in the response.");

  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
}