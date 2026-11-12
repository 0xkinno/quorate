import { createGoogleGenerativeAI } from "@ai-sdk/google";

/** The one place a model is chosen. LLM_BACKEND=replay uses recorded answers and calls no model. */
export const MODEL_ID = process.env.GEMINI_MODEL || "gemini-3-flash-preview";
export const backend = () => (process.env.LLM_BACKEND === "replay" || !process.env.GEMINI_API_KEY ? "replay" : "gemini");
export function model() {
  return createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY })(MODEL_ID);
}
