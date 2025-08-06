import OpenAI from "openai";
import { RecipeScraper, RecipeSource } from "./recipe-scraper.js";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const recipeScraper = new RecipeScraper();

export interface GenerateRecipesOptions {
  num_people: number;
  ingredients: string;
  dietary?: string;
  fridgeIngredients?: string[]; // Available ingredients from fridge
}

export interface Recipe {
  title: string;
  ingredients: string[];
  instructions: string[];
  cookTime?: string;
  servings?: number;
  missing_ingredients?: string[];
  source?: string;
}

export async function generateRecipes(options: GenerateRecipesOptions): Promise<Recipe[]> {
  const { num_people, ingredients, dietary, fridgeIngredients } = options;
  
  const dietaryInfo = dietary ? ` with ${dietary} dietary restrictions` : '';
  
  let availableIngredients: string[] = [];
  let ingredientContext = '';
  
  if (fridgeIngredients && fridgeIngredients.length > 0) {
    availableIngredients = fridgeIngredients;
    ingredientContext = `Available ingredients in their fridge: ${fridgeIngredients.join(', ')}. `;
    if (ingredients) {
      ingredientContext += `Additional requested ingredients: ${ingredients}. `;
      availableIngredients = [...fridgeIngredients, ...ingredients.split(',').map(i => i.trim())];
    }
    ingredientContext += `Prioritize using ingredients from their fridge when possible.`;
  } else {
    availableIngredients = ingredients ? ingredients.split(',').map(i => i.trim()) : [];
    ingredientContext = `Using these ingredients: ${ingredients}.`;
  }

  // Step 1: Get recipe inspiration from online sources
  let onlineRecipes: RecipeSource[] = [];
  try {
    const searchQuery = availableIngredients.slice(0, 3).join(' ') + (dietary ? ` ${dietary}` : '');
    onlineRecipes = await recipeScraper.searchRecipes(searchQuery);
    
    // Fallback to structured recipes if scraping fails
    if (onlineRecipes.length === 0) {
      onlineRecipes = recipeScraper.generateStructuredRecipes(availableIngredients, dietary, num_people);
    }
  } catch (error) {
    console.log("Recipe scraping failed, using fallback:", error instanceof Error ? error.message : 'Unknown error');
    onlineRecipes = recipeScraper.generateStructuredRecipes(availableIngredients, dietary, num_people);
  }

  // Step 2: Create context from scraped recipes
  const recipeContext = onlineRecipes.map(recipe => 
    `Recipe: ${recipe.title}\nIngredients: ${recipe.ingredients.join(', ')}\nInstructions: ${recipe.instructions.join(' ')}`
  ).join('\n\n');

  const prompt = `Using the following recipe context from professional cooking websites, create 3 unique and delicious recipes for ${num_people} ${num_people === 1 ? 'person' : 'people'}. ${ingredientContext}${dietaryInfo}.

RECIPE CONTEXT FROM COOKING WEBSITES:
${recipeContext}

For each recipe you create:
1. Draw inspiration from the provided recipe context but create original variations
2. List ALL ingredients needed (including those the user has and those they need to buy)
3. Identify which ingredients the user is missing from their available ingredients
4. Provide step-by-step cooking instructions
5. Include estimated cooking time and servings

Available user ingredients: ${availableIngredients.join(', ')}

Respond with valid JSON in this exact format:
{
  "recipes": [
    {
      "title": "Creative Recipe Name",
      "ingredients": ["complete ingredient list with measurements"],
      "instructions": ["detailed step-by-step instructions"],
      "cookTime": "X minutes",
      "servings": ${num_people},
      "missing_ingredients": ["ingredients not in user's available list"],
      "source": "Inspired by online recipes"
    }
  ]
}

Focus on creating practical, achievable recipes that make good use of available ingredients while suggesting realistic additions.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a professional chef with access to recipe databases. Create inspired, practical recipes using provided context and user ingredients. Always respond with valid JSON format including missing ingredients analysis."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
    });

    const result = JSON.parse(response.choices[0].message.content || '{"recipes": []}');
    return result.recipes || [];
  } catch (error) {
    console.error("Failed to generate recipes:", error);
    throw new Error("Failed to generate recipes. Please try again.");
  }
}