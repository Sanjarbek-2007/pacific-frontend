import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const aiClient = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

async function listModels() {
  try {
    const list = await aiClient.models.get({model: "gemini-1.5-flash-8b"});
    console.log("Model fetched:", list.name);
  } catch (err) {
    console.error("SDK Error:", err);
  }
}

listModels();
