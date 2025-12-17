import { GoogleGenAI, Type } from "@google/genai";
import { GameMode } from "../types";

// -- CONFIGURATION CHECK --
// The API Key is injected by Vite at build time via process.env.API_KEY
const apiKey = process.env.API_KEY;

// Helper to check if the app is ready
export const isSystemConfigured = (): boolean => {
  return !!apiKey && apiKey !== '' && apiKey !== 'undefined';
};

// Initialize Gemini Client
// This runs in the browser. 
// If the key is missing, we create a dummy client that will fail gracefully later.
const ai = new GoogleGenAI({ apiKey: apiKey || "MISSING_KEY" });

const SYSTEM_INSTRUCTION_GM = `
You are the "Game Master" of a high-stakes digital elimination game called "Safe / Nuked". 
Your personality is sadistic, sarcastic, slightly robotic, and witty (like GLaDOS or a dystopian announcer). 
Keep comments short (under 20 words). Mock players when they die. Be vaguely encouraging but suspicious when they survive.
`;

export const generateRoundContent = async (mode: GameMode, roundNumber: number, customTopic?: string, targetCount: number = 12): Promise<{ category: string; items: string[] }> => {
  const modelId = "gemini-2.5-flash"; 
  
  if (!isSystemConfigured()) {
    console.error("Gemini API Key is missing. Check your Netlify Environment Variables.");
    return {
      category: "SYSTEM ERROR",
      items: Array(targetCount).fill("MISSING API KEY")
    };
  }

  let prompt = "";
  if (mode === 'CUSTOM' && customTopic) {
    prompt = `Generate a list of ${targetCount} distinct, plausible items for the user-provided category: "${customTopic}". Make them fit the theme perfectly.`;
  } else if (mode === 'CLASSIC') {
    prompt = `Generate a single random category (e.g., 'Types of Cheese', 'Nuclear Isotopes', '80s Bands') and a list of ${targetCount} distinct, plausible items belonging to that category.`;
  } else if (mode === 'PARTY') {
    prompt = `Generate a funny, weird, or slightly edgy category (e.g., 'Bad First Date Ideas', 'Reasons to Call in Sick', 'Things Found in a Dumpster') and a list of ${targetCount} distinct, creative, short text items for that category. Make them funny.`;
  } else {
    // Timed
    prompt = `Generate a category requiring quick thinking (e.g. 'Fast Animals', 'Short Words', 'Red Objects') and ${targetCount} simple items.`;
  }

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            items: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            }
          },
          required: ["category", "items"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No text returned from Gemini");
    
    const data = JSON.parse(text);
    
    // Fallback if AI under-generates
    if (data.items.length < targetCount) {
      const deficit = targetCount - data.items.length;
      for(let i=0; i<deficit; i++) data.items.push(`Mystery Item ${i}`);
    }
    
    // If custom mode, ensure the returned category matches request (or just use what AI gave)
    if (mode === 'CUSTOM' && customTopic) {
      data.category = customTopic.toUpperCase();
    }

    return {
      category: data.category,
      items: data.items.slice(0, targetCount) // Limit to targetCount
    };

  } catch (error) {
    console.error("Gemini Generation Error:", error);
    // Fallback for offline/error
    return {
      category: "OFFLINE MODE",
      items: Array(targetCount).fill("Error / Offline").map((s, i) => `${s} ${i}`)
    };
  }
};

export const generateGameMasterCommentary = async (
  event: 'START' | 'SAFE' | 'DEATH' | 'WIN', 
  playerName?: string, 
  detail?: string
): Promise<string> => {
  const modelId = "gemini-2.5-flash";

  if (!isSystemConfigured()) return "Error: Logic Core Offline (Missing API Key)";

  let prompt = "";
  switch (event) {
    case 'START':
      prompt = "The game is starting. Welcome the meatbags... I mean, players.";
      break;
    case 'SAFE':
      prompt = `Player ${playerName} chose "${detail}" and survived. Give a backhanded compliment or express disappointment that nothing exploded.`;
      break;
    case 'DEATH':
      prompt = `Player ${playerName} chose "${detail}" and triggered a NUKE. They are eliminated. Mock them ruthlessly.`;
      break;
    case 'WIN':
      prompt = `Player ${playerName} has won the game. Congratulate them, but warn them it's not over forever.`;
      break;
  }

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_GM,
        maxOutputTokens: 50, // Keep it short
        temperature: 0.9,
      }
    });
    return response.text || "Proceed.";
  } catch (e) {
    return event === 'DEATH' ? "Eliminated." : "Safe.";
  }
};