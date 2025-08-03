import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface GenerateRecipesOptions {
  num_people: number;
  ingredients: string;
  dietary: string;
}

export interface Recipe {
  title: string;
  ingredients: string[];
  instructions: string[];
}

export async function generateRecipes(options: GenerateRecipesOptions): Promise<Recipe[]> {
  const { num_people, ingredients, dietary } = options;
  
  /**
   * Generate 3–5 recipes using OpenAI.
   * Args:
   *     num_people (int): Number of people.
   *     ingredients (str): Ingredients to use.
   *     dietary (str): Dietary restrictions.
   * Returns:
   *     List of recipes as dicts with 'title', 'ingredients', 'instructions'.
   */
  
  const prompt = `
You are a professional chef. Create between 3 and 5 unique recipes for ${num_people} people using these ingredients: ${ingredients}.
Ensure they adhere to these dietary restrictions: ${dietary}.

Return your answer as a JSON array where each item is an object with these keys:
"title" (string), 
"ingredients" (list of strings), 
"instructions" (list of step-by-step instructions).

Only output valid JSON. Do not include any extra text.
`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const content = response.choices[0].message.content?.trim() || "[]";
    
    try {
      const recipes = JSON.parse(content);
      return recipes;
    } catch (jsonError) {
      console.error("Failed to parse GPT response. Raw output below:");
      console.error(content);
      throw jsonError;
    }
  } catch (error) {
    console.error("Failed to generate recipes:", error);
    throw new Error("Failed to generate recipes. Please try again.");
  }
}