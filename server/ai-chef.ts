import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface GenerateRecipesOptions {
  num_people: number;
  ingredients: string;
  dietary?: string;
}

export interface Recipe {
  title: string;
  ingredients: string[];
  instructions: string[];
  cookTime?: string;
  servings?: number;
}

export async function generateRecipes(options: GenerateRecipesOptions): Promise<Recipe[]> {
  const { num_people, ingredients, dietary } = options;
  
  const dietaryInfo = dietary ? ` with ${dietary} dietary restrictions` : '';
  const prompt = `Create 3 delicious and practical recipes for ${num_people} ${num_people === 1 ? 'person' : 'people'} using these ingredients: ${ingredients}${dietaryInfo}.

For each recipe, provide:
1. A creative and appetizing title
2. Complete ingredient list with measurements
3. Step-by-step cooking instructions
4. Estimated cooking time
5. Number of servings

Respond with valid JSON in this exact format:
{
  "recipes": [
    {
      "title": "Recipe Name",
      "ingredients": ["ingredient 1", "ingredient 2"],
      "instructions": ["step 1", "step 2"],
      "cookTime": "25 minutes",
      "servings": 2
    }
  ]
}

Focus on recipes that make good use of the provided ingredients while being realistic and achievable for home cooking.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a professional chef and recipe creator. Create practical, delicious recipes using the provided ingredients. Always respond with valid JSON format."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const result = JSON.parse(response.choices[0].message.content || '{"recipes": []}');
    return result.recipes || [];
  } catch (error) {
    console.error("Failed to generate recipes:", error);
    throw new Error("Failed to generate recipes. Please try again.");
  }
}