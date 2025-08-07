import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertFoodItemSchema, insertRecipeSchema } from "@shared/schema";
import { z } from "zod";
import { generateRecipes } from "./ai-chef";
import { enhancedMemorySystem, getSubstitutions } from "./enhanced-memory-fallback.js";
import { conversationalAgent } from "./conversational-agent.js";

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

  
  const detectCuisineRequest = (query: string) => {
    const lowerQuery = query.toLowerCase();
    const cuisineTypes = ['italian', 'asian', 'chinese', 'japanese', 'mexican', 'indian', 'thai', 'mediterranean', 'french', 'american', 'korean', 'vietnamese'];
    return cuisineTypes.find(cuisine => lowerQuery.includes(cuisine)) || null;
  };

  // Enhanced Conversational AI Chat Route with LangChain
  app.post("/api/ai-chat", async (req, res) => {
    try {
      const { query, userId = 'default' } = req.body;
      
      if (!query) {
        return res.status(400).json({ error: "Query is required" });
      }

      // Use the conversational agent with message history and system prompts
      const result = await conversationalAgent.processConversation(userId, query);
      
      const response = {
        thought_process: result.reasoning,
        final_answer: result.message,
        suggestions: result.suggestions,
        recipes: result.recipes || [],
        user_preferences: result.userPreferences,
        enhanced_context: result.enhancedContext,
        conversation_stats: {
          message_count: result.conversationLength,
          conversation_type: 'persistent_langchain'
        }
      };
      
      res.json(response);
    } catch (error) {
      console.error("AI chat error:", error);
      res.status(500).json({ error: "Failed to process AI query" });
    }
  });

  // New endpoint to clear conversation history (fresh start)
  app.post("/api/ai-chat/clear", async (req, res) => {
    try {
      const { userId = 'default' } = req.body;
      conversationalAgent.clearConversation(userId);
      res.json({ status: 'success', message: 'Conversation history cleared' });
    } catch (error) {
      console.error("Clear conversation error:", error);
      res.status(500).json({ error: "Failed to clear conversation" });
    }
  });

  // New endpoint to get conversation statistics
  app.get("/api/ai-chat/stats/:userId", async (req, res) => {
    try {
      const userId = req.params.userId || 'default';
      const stats = conversationalAgent.getConversationStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Get stats error:", error);
      res.status(500).json({ error: "Failed to get conversation stats" });
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
