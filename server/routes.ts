import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertFoodItemSchema, insertRecipeSchema } from "@shared/schema";
import { z } from "zod";
import { generateRecipes } from "./ai-chef";

export async function registerRoutes(app: Express): Promise<Server> {
  // Food Items Routes
  app.get("/api/food-items", async (req, res) => {
    try {
      const items = await storage.getFoodItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch food items" });
    }
  });

  app.get("/api/food-items/:id", async (req, res) => {
    try {
      const item = await storage.getFoodItem(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Food item not found" });
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch food item" });
    }
  });

  app.post("/api/food-items", async (req, res) => {
    try {
      const validatedData = insertFoodItemSchema.parse(req.body);
      const item = await storage.createFoodItem(validatedData);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create food item" });
    }
  });

  app.put("/api/food-items/:id", async (req, res) => {
    try {
      const validatedData = insertFoodItemSchema.partial().parse(req.body);
      const item = await storage.updateFoodItem(req.params.id, validatedData);
      if (!item) {
        return res.status(404).json({ error: "Food item not found" });
      }
      res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update food item" });
    }
  });

  app.delete("/api/food-items/:id", async (req, res) => {
    try {
      const success = await storage.deleteFoodItem(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Food item not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete food item" });
    }
  });

  // Recipes Routes
  app.get("/api/recipes", async (req, res) => {
    try {
      const recipes = await storage.getRecipes();
      res.json(recipes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recipes" });
    }
  });

  app.get("/api/recipes/:id", async (req, res) => {
    try {
      const recipe = await storage.getRecipe(req.params.id);
      if (!recipe) {
        return res.status(404).json({ error: "Recipe not found" });
      }
      res.json(recipe);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recipe" });
    }
  });

  app.post("/api/recipes", async (req, res) => {
    try {
      const validatedData = insertRecipeSchema.parse(req.body);
      const recipe = await storage.createRecipe(validatedData);
      res.status(201).json(recipe);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create recipe" });
    }
  });

  app.put("/api/recipes/:id", async (req, res) => {
    try {
      const validatedData = insertRecipeSchema.partial().parse(req.body);
      const recipe = await storage.updateRecipe(req.params.id, validatedData);
      if (!recipe) {
        return res.status(404).json({ error: "Recipe not found" });
      }
      res.json(recipe);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update recipe" });
    }
  });

  app.delete("/api/recipes/:id", async (req, res) => {
    try {
      const success = await storage.deleteRecipe(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Recipe not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete recipe" });
    }
  });

  // User preferences storage (in production, use database)
  const userPreferences = new Map();
  
  const extractUserPreferences = (query: string, userId: string) => {
    const lowerQuery = query.toLowerCase();
    const prefs = userPreferences.get(userId) || { dislikedIngredients: [], preferredCuisines: [], dietaryRestrictions: [] };
    
    // Extract dislikes
    const dislikePatterns = [
      /i don't like ([^,.!?]+)/g,
      /i hate ([^,.!?]+)/g,
      /no ([^,.!?]+)/g,
      /not a fan of ([^,.!?]+)/g,
      /avoid ([^,.!?]+)/g
    ];
    
    let foundDislikes: string[] = [];
    dislikePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(lowerQuery)) !== null) {
        const disliked = match[1].trim();
        if (!prefs.dislikedIngredients.includes(disliked)) {
          prefs.dislikedIngredients.push(disliked);
          foundDislikes.push(disliked);
        }
      }
    });
    
    // Extract cuisine preferences
    const cuisineTypes = ['italian', 'asian', 'chinese', 'japanese', 'mexican', 'indian', 'thai', 'mediterranean', 'french', 'american', 'korean', 'vietnamese'];
    cuisineTypes.forEach(cuisine => {
      if (lowerQuery.includes(cuisine)) {
        if (!prefs.preferredCuisines.includes(cuisine)) {
          prefs.preferredCuisines.push(cuisine);
        }
      }
    });
    
    // Extract dietary preferences
    if (lowerQuery.includes('vegetarian') && !prefs.dietaryRestrictions.includes('vegetarian')) {
      prefs.dietaryRestrictions.push('vegetarian');
    }
    if (lowerQuery.includes('vegan') && !prefs.dietaryRestrictions.includes('vegan')) {
      prefs.dietaryRestrictions.push('vegan');
    }
    if ((lowerQuery.includes('gluten-free') || lowerQuery.includes('gluten free')) && !prefs.dietaryRestrictions.includes('gluten-free')) {
      prefs.dietaryRestrictions.push('gluten-free');
    }
    
    userPreferences.set(userId, prefs);
    return { preferences: prefs, newDislikes: foundDislikes };
  };
  
  const detectCuisineRequest = (query: string) => {
    const lowerQuery = query.toLowerCase();
    const cuisineTypes = ['italian', 'asian', 'chinese', 'japanese', 'mexican', 'indian', 'thai', 'mediterranean', 'french', 'american', 'korean', 'vietnamese'];
    return cuisineTypes.find(cuisine => lowerQuery.includes(cuisine)) || null;
  };

  // Enhanced AI Chat Route
  app.post("/api/ai-chat", async (req, res) => {
    try {
      const { query, userId = 'default' } = req.body;
      
      if (!query) {
        return res.status(400).json({ error: "Query is required" });
      }

      // Extract and save user preferences
      const { preferences, newDislikes } = extractUserPreferences(query, userId);
      const requestedCuisine = detectCuisineRequest(query);
      
      const lowerQuery = query.toLowerCase();
      const isRecipeRequest = lowerQuery.includes('recipe') || 
                             lowerQuery.includes('cook') || 
                             lowerQuery.includes('make') || 
                             lowerQuery.includes('generate') ||
                             lowerQuery.includes('create') ||
                             requestedCuisine !== null;

      let thoughtProcess = [
        {
          step: "Query Analysis & Learning",
          reasoning: `Analyzing your request: "${query}". ${newDislikes.length > 0 ? `Learned that you don't like: ${newDislikes.join(', ')}. ` : ''}${requestedCuisine ? `Detected ${requestedCuisine} cuisine request. ` : ''}`,
          action: isRecipeRequest ? "Detected recipe generation request" : "Processing general cooking question",
          result: `${isRecipeRequest ? 'Preparing to generate personalized recipes' : 'Ready to provide cooking advice'}. Current preferences: ${preferences.dislikedIngredients.length} dislikes, ${preferences.dietaryRestrictions.length} dietary restrictions.`
        }
      ];

      if (isRecipeRequest) {
        // Get fridge ingredients for context
        const fridgeItems = await storage.getFoodItems();
        let fridgeIngredients = fridgeItems.map(item => item.name);
        
        // Filter out disliked ingredients
        const originalCount = fridgeIngredients.length;
        fridgeIngredients = fridgeIngredients.filter(ingredient => 
          !preferences.dislikedIngredients.some((disliked: string) => 
            ingredient.toLowerCase().includes(disliked.toLowerCase())
          )
        );
        const filteredCount = originalCount - fridgeIngredients.length;
        
        thoughtProcess.push({
          step: "Intelligent Ingredient Analysis",
          reasoning: `Found ${originalCount} ingredients in your fridge. ${filteredCount > 0 ? `Filtered out ${filteredCount} items you don't like. ` : ''}${requestedCuisine ? `Focusing on ${requestedCuisine} cuisine compatibility. ` : ''}`,
          action: "Analyzing available ingredients for recipe compatibility while respecting your preferences",
          result: `Available for recipes: ${fridgeIngredients.slice(0, 5).join(', ')}${fridgeIngredients.length > 5 ? '...' : ''}${preferences.dislikedIngredients.length > 0 ? ` (avoiding: ${preferences.dislikedIngredients.join(', ')})` : ''}`
        });

        // Extract recipe parameters from query
        const peopleMatch = query.match(/(\d+)\s*(people|person|servings?)/i);
        const num_people = peopleMatch ? parseInt(peopleMatch[1]) : 2;

        thoughtProcess.push({
          step: "Personalized Recipe Strategy",
          reasoning: `Creating ${requestedCuisine || 'diverse'} recipes for ${num_people} people using your preferences and available ingredients`,
          action: `Generating personalized recipes ${requestedCuisine ? `in ${requestedCuisine} style ` : ''}while avoiding ingredients you dislike`,
          result: `Ready to create delicious ${requestedCuisine || 'personalized'} recipes tailored to your taste`
        });

        // Enhanced recipe generation with preferences
        let ingredients = fridgeIngredients.length > 0 ? fridgeIngredients.join(', ') : 'general ingredients';
        if (requestedCuisine) {
          ingredients += `, focusing on ${requestedCuisine} cuisine`;
        }
        if (preferences.dislikedIngredients.length > 0) {
          ingredients += `, avoiding: ${preferences.dislikedIngredients.join(', ')}`;
        }
        
        const recipes = await generateRecipes({
          num_people,
          ingredients,
          dietary: preferences.dietaryRestrictions.join(', ') || undefined,
          fridgeIngredients
        });

        let finalAnswer = `I've analyzed your ${originalCount} fridge ingredients and generated ${recipes.length} ${requestedCuisine || 'personalized'} recipes for you!`;
        if (filteredCount > 0) {
          finalAnswer += ` I've excluded ${filteredCount} ingredients you don't like.`;
        }
        if (newDislikes.length > 0) {
          finalAnswer += ` I've learned your new preferences and will remember them for future recipes.`;
        }
        finalAnswer += ` Each recipe shows exactly which ingredients you have and what you'll need to buy. Click the bookmark to save favorites!`;
        
        const suggestions = [
          "Save your favorite recipes to your collection",
          "Tell me about more foods you like or dislike",
          requestedCuisine ? `Ask for more ${requestedCuisine} recipes` : "Try requesting a specific cuisine type"
        ];
        
        const response = {
          thought_process: thoughtProcess,
          final_answer: finalAnswer,
          suggestions,
          recipes: recipes,
          user_preferences: {
            dislikes: preferences.dislikedIngredients,
            cuisines: preferences.preferredCuisines,
            dietary: preferences.dietaryRestrictions
          }
        };
        
        res.json(response);
      } else {
        // Handle general cooking questions
        let finalAnswer = "";
        let suggestions = [];

        if (lowerQuery.includes('storage') || lowerQuery.includes('store')) {
          finalAnswer = "Proper food storage is crucial for freshness! Here are some key tips: Keep fruits and vegetables separate, store herbs in water like flowers, and use the crisper drawers for vegetables. Most leftovers stay fresh for 3-4 days in the refrigerator.";
          suggestions = ["Ask about storage for specific foods", "Get tips on extending food freshness", "Learn about freezer storage techniques"];
        } else if (lowerQuery.includes('expir') || lowerQuery.includes('fresh')) {
          finalAnswer = "Managing expiration dates helps reduce waste! Use the 'first in, first out' principle - use older items first. Check your fridge regularly and prioritize ingredients expiring soon in your meal planning.";
          suggestions = ["Generate recipes with expiring ingredients", "Learn food safety guidelines", "Get tips on meal planning"];
        } else if (lowerQuery.includes('tip') || lowerQuery.includes('advice')) {
          finalAnswer = "I'd love to share cooking tips! For better flavors, always taste as you cook and season gradually. Prep ingredients before you start cooking (mise en place). Let meat rest after cooking for juicier results.";
          suggestions = ["Ask about specific cooking techniques", "Get ingredient-specific tips", "Learn about kitchen organization"];
        } else {
          finalAnswer = `I understand you're asking about: "${query}". As your AI kitchen assistant, I can help with recipes, cooking tips, food storage advice, meal planning, and more. What specific aspect of cooking would you like help with?`;
          suggestions = ["Generate recipes with your fridge ingredients", "Ask for cooking tips", "Get food storage advice"];
        }

        const response = {
          thought_process: thoughtProcess,
          final_answer: finalAnswer,
          suggestions: suggestions,
          recipes: []
        };
        
        res.json(response);
      }
    } catch (error) {
      console.error("AI chat error:", error);
      res.status(500).json({ error: "Failed to process AI query" });
    }
  });

  // AI Recipe Generation Route (Legacy)
  app.post("/api/generate-recipes", async (req, res) => {
    try {
      const { num_people, ingredients, dietary, fridgeIngredients } = req.body;
      
      if (!num_people || (!ingredients && !fridgeIngredients)) {
        return res.status(400).json({ error: "Number of people and either ingredients or fridgeIngredients are required" });
      }

      const recipes = await generateRecipes({
        num_people: parseInt(num_people),
        ingredients: ingredients || '',
        dietary,
        fridgeIngredients
      });

      res.json({ recipes });
    } catch (error) {
      console.error("Recipe generation error:", error);
      res.status(500).json({ error: "Failed to generate recipes. Please try again." });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
