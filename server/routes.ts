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

  // Enhanced AI Chat Route
  app.post("/api/ai-chat", async (req, res) => {
    try {
      const { query, userId } = req.body;
      
      if (!query) {
        return res.status(400).json({ error: "Query is required" });
      }

      const lowerQuery = query.toLowerCase();
      const isRecipeRequest = lowerQuery.includes('recipe') || 
                             lowerQuery.includes('cook') || 
                             lowerQuery.includes('make') || 
                             lowerQuery.includes('generate') ||
                             lowerQuery.includes('create');

      let thoughtProcess = [
        {
          step: "Query Analysis",
          reasoning: `Analyzing your request: "${query}"`,
          action: isRecipeRequest ? "Detected recipe generation request" : "Processing general cooking question",
          result: isRecipeRequest ? "Preparing to generate personalized recipes" : "Ready to provide cooking advice"
        }
      ];

      if (isRecipeRequest) {
        // Get fridge ingredients for context
        const fridgeItems = await storage.getFoodItems();
        const fridgeIngredients = fridgeItems.map(item => item.name);
        
        thoughtProcess.push({
          step: "Ingredient Analysis",
          reasoning: `Found ${fridgeIngredients.length} ingredients in your fridge`,
          action: "Analyzing available ingredients for recipe compatibility",
          result: `Available: ${fridgeIngredients.slice(0, 5).join(', ')}${fridgeIngredients.length > 5 ? '...' : ''}`
        });

        // Extract recipe parameters from query
        const peopleMatch = query.match(/(\d+)\s*(people|person|servings?)/i);
        const num_people = peopleMatch ? parseInt(peopleMatch[1]) : 2;

        thoughtProcess.push({
          step: "Recipe Generation Strategy",
          reasoning: `Creating recipes for ${num_people} people using available ingredients`,
          action: "Generating personalized recipes with nutritional balance",
          result: "Ready to create delicious recipes using AI"
        });

        // Generate recipes using existing system
        const recipes = await generateRecipes({
          num_people,
          ingredients: fridgeIngredients.length > 0 ? fridgeIngredients.join(', ') : 'general ingredients',
          dietary: undefined,
          fridgeIngredients
        });

        const response = {
          thought_process: thoughtProcess,
          final_answer: `I've analyzed your ${fridgeIngredients.length} fridge ingredients and generated ${recipes.length} personalized recipes for you! Each recipe shows exactly which ingredients you already have and which ones you'll need to buy. Click the bookmark icon to save any recipe you like to your collection.`,
          suggestions: [
            "Save your favorite recipes to your collection",
            "Check which ingredients you need to buy",
            "Ask me about cooking tips for specific ingredients"
          ],
          recipes: recipes
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
