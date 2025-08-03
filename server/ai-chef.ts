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
  
  const prompt = `Create between 3 and 5 unique recipes for ${num_people} people using these ingredients: ${ingredients}.
Ensure they adhere to these dietary restrictions: ${dietary}.

Return only a JSON array where each item has these keys:
"title" (string), 
"ingredients" (array of strings), 
"instructions" (array of strings).

No markdown formatting. Pure JSON only.`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a professional chef. Always respond with valid JSON only, no markdown formatting."
        },
        { 
          role: "user", 
          content: prompt 
        }
      ],
      temperature: 0.7,
    });

    let content = response.choices[0].message.content?.trim() || "[]";
    
    // Remove any markdown code blocks completely
    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // Find the JSON array/object in the content
    const jsonMatch = content.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
    if (jsonMatch) {
      content = jsonMatch[0];
    }
    
    try {
      const result = JSON.parse(content);
      // Handle both array and object responses
      if (Array.isArray(result)) {
        return result;
      } else if (result.recipes && Array.isArray(result.recipes)) {
        return result.recipes;
      } else {
        return [result]; // Single recipe case
      }
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