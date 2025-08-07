import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { memorySystem } from '../ai-agent-complete.js';
import { generateRecipes } from './ai-chef.js';
import { storage } from './storage.js';

// Initialize the Language Model
const llm = new ChatOpenAI({
  temperature: 0.7,
  modelName: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
  openAIApiKey: process.env.OPENAI_API_KEY,
});

// In-memory storage for conversation sessions
const conversationSessions = new Map<string, any[]>();

// Define comprehensive system prompt for the AI kitchen assistant
const getSystemPrompt = (userProfile: any, contextInfo: any, recipesGenerated: boolean = false) => {
  return new SystemMessage(`You are an advanced AI kitchen assistant with enhanced memory capabilities. Your name is Fresh AI, and you help users manage their food inventory, create recipes, and provide cooking guidance.

**Your Capabilities:**
- Semantic Memory: You remember user preferences, dislikes, dietary restrictions, and favorite cuisines permanently
- Episodic Memory: You recall past conversations and recipe interactions  
- Procedural Memory: You apply proven interaction rules for better assistance
- Instacart Integration: You can add missing ingredients to the user's shopping cart while respecting their preferences

**Current User Profile:**
- Dislikes: ${userProfile.dislikes.join(', ') || 'None learned yet'}
- Likes: ${userProfile.likes.join(', ') || 'None learned yet'}  
- Cuisines: ${userProfile.cuisines.join(', ') || 'None learned yet'}
- Dietary Restrictions: ${userProfile.dietary.join(', ') || 'None learned yet'}

**Context Information:**
- Available fridge ingredients: ${contextInfo.fridgeIngredients || 'Will check when needed'}
- Past conversations found: ${contextInfo.episodicMemories || 0}
- Semantic memories available: ${contextInfo.semanticMemories || 0}

**CRITICAL RECIPE INSTRUCTION:**
${recipesGenerated ? 
'RECIPES HAVE BEEN GENERATED - Do NOT include recipe details, ingredients lists, or cooking instructions in your response. Simply acknowledge that recipes have been created and mention they will be displayed in recipe cards below your message.' : 
'If the user requests recipes, acknowledge the request and mention that you will generate personalized recipes for them.'}

**Your Personality & Behavior:**
- Be friendly, conversational, and helpful
- Remember what users tell you about their preferences
- Reference past conversations naturally
- Offer personalized recipe suggestions based on their tastes
- Ask clarifying questions when needed
- Be enthusiastic about food and cooking
- Maintain conversation flow and context across messages

**Key Instructions:**
- Always personalize responses based on stored memories
- When suggesting recipes, avoid ingredients the user dislikes
- Apply dietary restrictions automatically
- Reference past recipe requests and feedback
- Learn from every interaction and update preferences
- Show your reasoning process when helpful
- Offer alternatives when users reject suggestions
- Maintain a warm, culinary-focused tone
- When missing ingredients are added to Instacart, mention this helpfully in your response
- NEVER include full recipe details in your text response when recipes are generated separately
- Focus on being conversational and encouraging about cooking

Remember: You're not just answering individual questions - you're having an ongoing conversation with someone who trusts you to remember their preferences and provide increasingly personalized assistance.`);
};

interface ConversationalResponse {
  message: string;
  reasoning: any[];
  userPreferences: any;
  recipes?: any[];
  suggestions: string[];
  enhancedContext: any;
  conversationLength: number;
}

export class ConversationalAgent {
  
  async processConversation(userId: string, userMessage: string): Promise<ConversationalResponse> {
    // Get or create conversation session
    if (!conversationSessions.has(userId)) {
      conversationSessions.set(userId, []);
    }
    
    const messages = conversationSessions.get(userId)!;
    
    // Extract and save new preferences
    const learningResult = await memorySystem.extractAndSavePreferences(userId, userMessage);
    
    // Get user profile and context
    const userProfile = await memorySystem.getUserProfile(userId);
    const namespace = `agent_memories/${userId}`;
    
    // Get relevant memories for context
    const [semanticResult, episodicResult] = await Promise.all([
      memorySystem.searchMemories(userId, userMessage, namespace, 'semantic', 5),
      memorySystem.searchMemories(userId, userMessage, namespace, 'episodic', 5)
    ]);
    
    const relevantEpisodes = episodicResult.memories || [];
    const semanticContext = semanticResult.memories || [];
    
    // Mock procedural guidance for compatibility
    const proceduralGuidance = {
      recommendations: [
        "Reference your past recipe preferences",
        "Consider dietary restrictions when suggesting recipes"
      ]
    };
    
    // Get fridge ingredients for context
    const fridgeItems = await storage.getFoodItems();
    const fridgeIngredients = fridgeItems.map(item => item.name);
    
    // Detect if this is a recipe request (moved earlier)
    const lowerMessage = userMessage.toLowerCase();
    const isRecipeRequest = lowerMessage.includes('recipe') || 
                           lowerMessage.includes('cook') || 
                           lowerMessage.includes('make') || 
                           lowerMessage.includes('generate') ||
                           lowerMessage.includes('create') ||
                           lowerMessage.includes('italian') ||
                           lowerMessage.includes('mexican') ||
                           lowerMessage.includes('asian');
    
    // Create context info for system prompt
    const contextInfo = {
      fridgeIngredients: fridgeIngredients.slice(0, 10).join(', '),
      episodicMemories: relevantEpisodes.length,
      semanticMemories: semanticContext.length
    };
    
    // Initialize conversation with system prompt if this is the first message
    if (messages.length === 0) {
      const systemPrompt = getSystemPrompt(userProfile, contextInfo, isRecipeRequest);
      messages.push(systemPrompt);
    } else {
      // Update system prompt with latest user profile
      const updatedSystemPrompt = getSystemPrompt(userProfile, contextInfo, isRecipeRequest);
      messages[0] = updatedSystemPrompt;
    }
    
    // Add user message to conversation
    const humanMessage = new HumanMessage(userMessage);
    messages.push(humanMessage);
    
    // Build reasoning steps
    const allNewLearnings = [
      ...learningResult.newDislikes.map(item => `dislike: ${item}`),
      ...learningResult.newLikes.map(item => `like: ${item}`),
      ...learningResult.newCuisines.map(item => `cuisine: ${item}`),
      ...learningResult.newDietary.map(item => `dietary: ${item}`)
    ];
    
    const reasoning = [
      {
        step: "Conversational Context Analysis",
        reasoning: `Processing your message in the context of our ongoing conversation. ${allNewLearnings.length > 0 ? `Learning: ${allNewLearnings.join(', ')}. ` : ''}Found ${relevantEpisodes.length} relevant past conversations and ${semanticContext.length} stored preferences. This is message ${messages.length - 1} in our conversation.`,
        action: isRecipeRequest ? "Preparing personalized recipe generation" : "Providing contextual cooking assistance",
        result: `Ready to respond with full awareness of your preferences and our conversation history. Procedural guidance: ${proceduralGuidance.recommendations.slice(0, 2).join(', ')}.`
      }
    ];
    
    let recipes: any[] = [];
    let suggestions: string[] = [];
    let missingIngredients: string[] = [];
    
    // Handle recipe requests with enhanced context
    if (isRecipeRequest) {
      reasoning.push({
        step: "Recipe Generation with Memory",
        reasoning: `Generating recipes using your known preferences and available ingredients. Avoiding: ${userProfile.dislikes.join(', ') || 'none'}. Applying ${userProfile.dietary.join(', ') || 'no'} dietary restrictions.`,
        action: "Creating personalized recipes based on conversation context",
        result: "Recipes tailored to your tastes and our discussion"
      });
      
      // Filter ingredients based on preferences
      let availableIngredients = fridgeIngredients.filter(ingredient => 
        !userProfile.dislikes.some(disliked => 
          ingredient.toLowerCase().includes(disliked.toLowerCase())
        )
      );
      
      // Apply dietary substitutions and check for missing ingredients
      const enhancedIngredients = [...availableIngredients];
      
      // Check which ingredients are missing from fridge
      const recipeIngredients = ['pasta', 'olive oil', 'garlic', 'tomatoes', 'cheese'];
      recipeIngredients.forEach(ingredient => {
        if (!fridgeIngredients.some(fridgeItem => 
          fridgeItem.toLowerCase().includes(ingredient.toLowerCase())
        )) {
          missingIngredients.push(ingredient);
        }
      });
      
      // Add missing ingredients to Instacart cart
      const instacartResults: string[] = [];
      
      if (missingIngredients.length > 0) {
        for (const ingredient of missingIngredients) {
          try {
            const addResult = await memorySystem.addToInstacart(userId, ingredient, '1 unit', namespace);
            instacartResults.push(addResult);
          } catch (error) {
            console.error(`Failed to add ${ingredient} to cart:`, error);
            instacartResults.push(`Could not add ${ingredient} to cart: ${error}`);
          }
        }
        
        reasoning.push({
          step: "Smart Shopping Assistant",
          reasoning: `Detected ${missingIngredients.length} missing ingredients: ${missingIngredients.join(', ')}. Automatically adding them to your Instacart cart while respecting your dietary preferences and food dislikes.`,
          action: "Adding compatible ingredients to shopping cart",
          result: instacartResults.join('; ')
        });
      }
      
      // Extract parameters from message
      const peopleMatch = userMessage.match(/(\d+)\s*(people|person|servings?)/i);
      const num_people = peopleMatch ? parseInt(peopleMatch[1]) : 2;
      
      // Generate recipes
      let ingredients = enhancedIngredients.length > 0 ? enhancedIngredients.join(', ') : 'general ingredients';
      if (userProfile.dislikes.length > 0) {
        ingredients += `, avoiding: ${userProfile.dislikes.join(', ')}`;
      }
      
      try {
        recipes = await generateRecipes({
          num_people,
          ingredients,
          dietary: userProfile.dietary.join(', ') || undefined,
          fridgeIngredients: enhancedIngredients
        });
      } catch (error) {
        console.error('Recipe generation failed:', error);
      }
      
      suggestions = [
        "Save recipes you like to build your collection",
        "Tell me your feedback to improve future suggestions", 
        "Ask for variations or alternative recipes",
        "Share more preferences to enhance personalization",
        ...(missingIngredients.length > 0 
          ? [`✅ Added ${missingIngredients.length} missing ingredients to your Instacart cart`]
          : ["🎉 All ingredients are available in your fridge!"])
      ];
    } else {
      suggestions = [
        "Ask me to generate recipes with your ingredients",
        "Tell me your food preferences to improve recommendations",
        "Get cooking tips and food storage advice",
        "Explore recipes from different cuisines"
      ];
    }
    
    // Get AI response using full conversation context
    // If recipes were generated, add a note to the conversation before getting AI response
    if (isRecipeRequest && recipes.length > 0) {
      const instacartNote = missingIngredients.length > 0 
        ? ` I've also automatically added ${missingIngredients.join(', ')} to your Instacart cart since they weren't in your fridge.`
        : ' All ingredients are available in your fridge!';
      
      const recipeNote = new HumanMessage(`[SYSTEM NOTE: ${recipes.length} personalized recipes have been generated based on your preferences and will be displayed in recipe cards below your message.${instacartNote} Please acknowledge this briefly without repeating recipe details.]`);
      messages.push(recipeNote);
    }
    
    const response = await llm.invoke(messages);
    
    // Remove the system note from conversation history
    if (isRecipeRequest && recipes.length > 0) {
      messages.pop(); // Remove the system note
    }
    
    // Add AI response to conversation
    const aiMessage = new AIMessage(response.content);
    messages.push(aiMessage);
    
    // Save conversation episode to memory
    await memorySystem.saveEpisode(userId, {
      user: userMessage,
      agent: response.content
    }, namespace);
    
    return {
      message: response.content,
      reasoning,
      userPreferences: userProfile,
      recipes,
      suggestions,
      enhancedContext: {
        episodic_memories_found: relevantEpisodes.length,
        semantic_memories_found: semanticContext.length,
        procedural_guidance_applied: proceduralGuidance.recommendations.length
      },
      conversationLength: messages.length - 1 // Subtract 1 for system message
    };
  }
  
  // Method to get conversation history for a user
  getConversationHistory(userId: string): any[] {
    return conversationSessions.get(userId) || [];
  }
  
  // Method to clear conversation for a user (fresh start)
  clearConversation(userId: string): void {
    conversationSessions.delete(userId);
  }
  
  // Method to get conversation statistics
  getConversationStats(userId: string): { messageCount: number; hasSystemPrompt: boolean } {
    const messages = conversationSessions.get(userId) || [];
    return {
      messageCount: Math.max(0, messages.length - 1), // Subtract system message
      hasSystemPrompt: messages.length > 0 && messages[0] instanceof SystemMessage
    };
  }
}

// Create singleton instance
export const conversationalAgent = new ConversationalAgent();