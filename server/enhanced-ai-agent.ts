import OpenAI from "openai";
import { Recipe } from "./ai-chef.js";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface UserPreferences {
  dietary_restrictions?: string[];
  favorite_cuisines?: string[];
  cooking_skill?: 'beginner' | 'intermediate' | 'advanced';
  disliked_ingredients?: string[];
  preferred_cooking_time?: string;
  household_size?: number;
}

interface ReasoningStep {
  step: string;
  reasoning: string;
  action?: string;
  result?: string;
}

interface AgentResponse {
  thought_process: ReasoningStep[];
  final_answer: string;
  recipes?: Recipe[];
  suggestions?: string[];
  memory_updates?: { [key: string]: any };
}

// In-memory user preferences storage (in production, use database)
const userMemory = new Map<string, UserPreferences>();

export class EnhancedAIAgent {
  private userId: string;
  
  constructor(userId: string = 'default_user') {
    this.userId = userId;
  }

  async processQuery(query: string, context?: { fridgeIngredients?: string[] }): Promise<AgentResponse> {
    const preferences = this.getUserPreferences();
    
    // Step 1: Analyze the query and plan approach
    const analysis = await this.analyzeQuery(query, preferences, context);
    
    // Step 2: Execute the planned approach
    const response = await this.executeApproach(analysis, query, preferences, context);
    
    // Step 3: Update user preferences if needed
    this.updatePreferencesFromQuery(query);
    
    return response;
  }

  private async analyzeQuery(query: string, preferences: UserPreferences, context?: any): Promise<ReasoningStep[]> {
    const systemPrompt = `You are an advanced AI kitchen assistant with sophisticated reasoning capabilities. 
    Analyze the user's query and create a step-by-step reasoning process to address their needs.
    
    Current user preferences: ${JSON.stringify(preferences)}
    Available fridge ingredients: ${context?.fridgeIngredients?.join(', ') || 'None specified'}
    
    Respond with a structured reasoning process including:
    1. Query understanding and intent detection
    2. Relevant context analysis 
    3. Approach planning
    4. Potential challenges or considerations
    
    Format as JSON with this structure:
    {
      "reasoning_steps": [
        {
          "step": "Understanding the query",
          "reasoning": "The user is asking for...",
          "action": "I need to...",
          "result": "This means I should..."
        }
      ]
    }`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this query: "${query}"` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const result = JSON.parse(response.choices[0].message.content || '{"reasoning_steps": []}');
      return result.reasoning_steps || [];
    } catch (error) {
      console.error("Analysis failed:", error);
      return [{
        step: "Fallback analysis",
        reasoning: "Using basic query processing due to analysis error",
        action: "Process query directly",
        result: "Proceeding with standard response"
      }];
    }
  }

  private async executeApproach(
    analysis: ReasoningStep[], 
    query: string, 
    preferences: UserPreferences, 
    context?: any
  ): Promise<AgentResponse> {
    const isRecipeRequest = this.isRecipeRequest(query);
    
    if (isRecipeRequest) {
      return await this.handleRecipeRequest(query, preferences, context, analysis);
    } else {
      return await this.handleGeneralQuery(query, preferences, context, analysis);
    }
  }

  private async handleRecipeRequest(
    query: string, 
    preferences: UserPreferences, 
    context?: any,
    analysis?: ReasoningStep[]
  ): Promise<AgentResponse> {
    const ingredientAnalysis = await this.analyzeIngredients(context?.fridgeIngredients || []);
    const recipeParams = this.extractRecipeParameters(query, preferences);
    
    // Generate recipes with enhanced reasoning
    const recipes = await this.generateIntelligentRecipes(recipeParams, ingredientAnalysis, preferences);
    
    const reasoningSteps: ReasoningStep[] = [
      ...(analysis || []),
      {
        step: "Ingredient Analysis",
        reasoning: `Analyzed ${context?.fridgeIngredients?.length || 0} fridge ingredients for freshness and compatibility`,
        action: "Prioritize ingredients by expiration and versatility",
        result: `Found ${ingredientAnalysis.fresh.length} fresh ingredients, ${ingredientAnalysis.expiring.length} expiring soon`
      },
      {
        step: "Recipe Generation Strategy",
        reasoning: "Considering user preferences, dietary restrictions, and available ingredients",
        action: "Generate recipes that maximize fridge usage while meeting dietary needs",
        result: `Generated ${recipes.length} personalized recipes`
      }
    ];

    return {
      thought_process: reasoningSteps,
      final_answer: `I've analyzed your available ingredients and generated ${recipes.length} recipes tailored to your preferences. I focused on using ingredients that are expiring soon and considered your dietary restrictions.`,
      recipes,
      suggestions: this.generateSuggestions(recipes, ingredientAnalysis),
      memory_updates: this.extractPreferencesFromQuery(query)
    };
  }

  private async handleGeneralQuery(
    query: string, 
    preferences: UserPreferences, 
    context?: any,
    analysis?: ReasoningStep[]
  ): Promise<AgentResponse> {
    const systemPrompt = `You are an intelligent kitchen assistant with sophisticated reasoning. 
    Provide helpful, personalized advice based on the user's query and their preferences.
    
    User preferences: ${JSON.stringify(preferences)}
    Available ingredients: ${context?.fridgeIngredients?.join(', ') || 'None'}
    
    Provide practical, actionable advice with clear reasoning.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query }
        ],
        temperature: 0.7,
      });

      const answer = response.choices[0].message.content || "I'm here to help with your kitchen needs!";
      
      return {
        thought_process: analysis || [],
        final_answer: answer,
        suggestions: this.generateGeneralSuggestions(query, context?.fridgeIngredients || []),
        memory_updates: this.extractPreferencesFromQuery(query)
      };
    } catch (error) {
      console.error("General query failed:", error);
      return {
        thought_process: analysis || [],
        final_answer: "I apologize, but I encountered an issue processing your request. Could you please try rephrasing your question?",
        suggestions: ["Try asking about recipes", "Ask for cooking tips", "Request meal planning help"]
      };
    }
  }

  private async analyzeIngredients(ingredients: string[]): Promise<{
    fresh: string[],
    expiring: string[],
    versatile: string[],
    recommendations: string[]
  }> {
    // Mock analysis - in real implementation, this would check expiration dates from the database
    const fresh = ingredients.filter(ing => !ing.toLowerCase().includes('old'));
    const expiring = ingredients.filter(ing => ing.toLowerCase().includes('old'));
    const versatile = ingredients.filter(ing => 
      ['onion', 'garlic', 'tomato', 'chicken', 'rice', 'pasta', 'eggs'].some(v => 
        ing.toLowerCase().includes(v)
      )
    );

    return {
      fresh,
      expiring,
      versatile,
      recommendations: this.generateIngredientRecommendations(ingredients)
    };
  }

  private async generateIntelligentRecipes(
    params: any, 
    ingredientAnalysis: any, 
    preferences: UserPreferences
  ): Promise<Recipe[]> {
    const prompt = `As an intelligent culinary AI, create recipes that demonstrate sophisticated reasoning:

    Available ingredients: ${ingredientAnalysis.fresh.join(', ')}
    Expiring soon: ${ingredientAnalysis.expiring.join(', ')}
    User preferences: ${JSON.stringify(preferences)}
    Request parameters: ${JSON.stringify(params)}

    REASONING APPROACH:
    1. Prioritize expiring ingredients to reduce waste
    2. Consider user's cooking skill level for complexity
    3. Match dietary restrictions and cuisine preferences
    4. Optimize for household size and cooking time
    5. Suggest complementary ingredients that enhance nutrition

    Generate 3 recipes with this enhanced reasoning. Include your logic in the recipe descriptions.

    Respond with valid JSON:
    {
      "recipes": [
        {
          "title": "Recipe Name",
          "ingredients": ["detailed ingredients with amounts"],
          "instructions": ["step-by-step instructions"],
          "cookTime": "X minutes",
          "servings": number,
          "reasoning": "Why this recipe makes sense for the user",
          "missing_ingredients": ["what they need to buy"],
          "nutritional_benefits": ["health benefits"],
          "difficulty": "beginner/intermediate/advanced",
          "source": "AI reasoning"
        }
      ]
    }`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an advanced culinary AI that creates recipes with sophisticated reasoning and personalization."
          },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
      });

      const result = JSON.parse(response.choices[0].message.content || '{"recipes": []}');
      return result.recipes || [];
    } catch (error) {
      console.error("Intelligent recipe generation failed:", error);
      return [];
    }
  }

  private isRecipeRequest(query: string): boolean {
    const recipeKeywords = ['recipe', 'cook', 'make', 'prepare', 'dish', 'meal', 'generate', 'create', 'suggest'];
    return recipeKeywords.some(keyword => query.toLowerCase().includes(keyword));
  }

  private extractRecipeParameters(query: string, preferences: UserPreferences) {
    const peopleMatch = query.match(/(\d+)\s*(people|person|servings?)/i);
    const num_people = peopleMatch ? parseInt(peopleMatch[1]) : (preferences.household_size || 2);
    
    const timeMatch = query.match(/(\d+)\s*(minutes?|mins?|hours?)/i);
    const timePreference = timeMatch ? timeMatch[0] : preferences.preferred_cooking_time;

    return {
      num_people,
      timePreference,
      skillLevel: preferences.cooking_skill || 'intermediate',
      dietaryRestrictions: preferences.dietary_restrictions || []
    };
  }

  private generateSuggestions(recipes: Recipe[], ingredientAnalysis: any): string[] {
    const suggestions = [
      "Consider batch cooking to save time throughout the week",
      "Use expiring ingredients first to minimize food waste"
    ];

    if (ingredientAnalysis.expiring.length > 0) {
      suggestions.push(`Priority: Use ${ingredientAnalysis.expiring.join(', ')} soon as they're expiring`);
    }

    if (ingredientAnalysis.versatile.length > 0) {
      suggestions.push(`Tip: ${ingredientAnalysis.versatile.slice(0, 2).join(' and ')} are versatile and can be used in many dishes`);
    }

    return suggestions;
  }

  private generateGeneralSuggestions(query: string, ingredients: string[]): string[] {
    const suggestions = ["Ask me about recipes using your fridge ingredients"];
    
    if (ingredients.length > 0) {
      suggestions.push(`You have ${ingredients.length} ingredients I could help you use in recipes`);
    }

    if (query.toLowerCase().includes('storage')) {
      suggestions.push("I can provide specific storage tips for different types of food");
    }

    return suggestions;
  }

  private generateIngredientRecommendations(ingredients: string[]): string[] {
    const recommendations = [];
    
    if (ingredients.some(ing => ing.toLowerCase().includes('chicken'))) {
      recommendations.push("Chicken pairs well with herbs, citrus, and root vegetables");
    }
    
    if (ingredients.some(ing => ing.toLowerCase().includes('tomato'))) {
      recommendations.push("Fresh basil and mozzarella would complement your tomatoes perfectly");
    }

    return recommendations;
  }

  private getUserPreferences(): UserPreferences {
    return userMemory.get(this.userId) || {};
  }

  private updatePreferencesFromQuery(query: string) {
    const preferences = this.getUserPreferences();
    const updates = this.extractPreferencesFromQuery(query);
    
    if (Object.keys(updates).length > 0) {
      userMemory.set(this.userId, { ...preferences, ...updates });
    }
  }

  private extractPreferencesFromQuery(query: string): { [key: string]: any } {
    const updates: { [key: string]: any } = {};
    const lowerQuery = query.toLowerCase();

    // Extract dietary preferences
    if (lowerQuery.includes('vegetarian')) {
      updates.dietary_restrictions = ['vegetarian'];
    }
    if (lowerQuery.includes('vegan')) {
      updates.dietary_restrictions = ['vegan'];
    }
    if (lowerQuery.includes('gluten-free') || lowerQuery.includes('gluten free')) {
      updates.dietary_restrictions = (updates.dietary_restrictions || []).concat(['gluten-free']);
    }

    // Extract cooking skill indicators
    if (lowerQuery.includes('simple') || lowerQuery.includes('easy') || lowerQuery.includes('beginner')) {
      updates.cooking_skill = 'beginner';
    }
    if (lowerQuery.includes('advanced') || lowerQuery.includes('complex') || lowerQuery.includes('challenging')) {
      updates.cooking_skill = 'advanced';
    }

    // Extract time preferences
    const quickMatch = lowerQuery.match(/quick|fast|(\d+)\s*minutes?/);
    if (quickMatch) {
      updates.preferred_cooking_time = 'quick';
    }

    return updates;
  }
}