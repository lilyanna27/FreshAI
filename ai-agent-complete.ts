import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import Database from 'better-sqlite3';
import { OpenAIEmbeddings } from '@langchain/openai';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// ===============================
// INTERFACES AND TYPES
// ===============================

interface MemoryEntry {
  id: string;
  user_id: string;
  namespace: string;
  content: string;
  timestamp: string;
  type: 'semantic' | 'episodic' | 'takeaway';
  similarity_score?: number;
}

interface MemoryResult {
  status: 'success' | 'error';
  message?: string;
  memories?: MemoryEntry[];
}

interface UserProfile {
  dislikes: string[];
  likes: string[];
  cuisines: string[];
  dietary: string[];
}

interface ConversationEpisode {
  user: string;
  assistant: string;
  timestamp: string;
  context?: any;
}

interface ConversationalResponse {
  message: string;
  reasoning: any[];
  userPreferences: any;
  recipes?: any[];
  suggestions: string[];
  enhancedContext: any;
  conversationLength: number;
}

interface ReasoningStep {
  step: string;
  reasoning: string;
  action?: string;
  result?: string;
}

interface GeneratedRecipe {
  title: string;
  ingredients: string[];
  instructions: string[];
  cookTime?: string;
  servings?: number;
  missing_ingredients?: string[];
  source?: string;
}

// ===============================
// ENHANCED MEMORY SYSTEM
// ===============================

// Procedural Memory Rules for Recipe Interactions
const PROCEDURAL_MEMORY_RULES = [
  "Store and recall past recipes requested by the user - Ensures continuity by referencing previous recipe interactions to maintain user preferences and context.",
  "Confirm user dietary preferences before suggesting recipes - Validates restrictions like vegan or gluten-free to ensure recommendations are suitable.",
  "Use past recipe interactions to personalize future suggestions - Leverages episodic memory to recommend recipes similar to those previously liked by the user.",
  "Provide clear recipe instructions with ingredient substitutions based on user preferences - Enhances usability by including alternatives (e.g., vegan cheese for dairy-free diets).",
  "Ask for clarification if user preferences are ambiguous or missing - Ensures accurate personalization by prompting for details like cuisine or spice tolerance.",
  "Maintain a friendly and culinary-focused tone in recipe discussions - Creates an engaging and appetizing user experience to encourage interaction.",
  "Summarize past recipe feedback to refine future recommendations - Uses takeaways from episodic memory to improve suggestion relevance.",
  "Offer alternative recipes if the user rejects initial suggestions - Demonstrates flexibility and responsiveness to user feedback.",
  "Acknowledge and confirm user feedback on recipes - Builds trust by validating user input and incorporating it into memory.",
  "Regularly update user preferences based on new interactions - Keeps semantic memory current to reflect evolving user tastes and dietary needs."
];

// Ingredient substitution system
const SUBSTITUTIONS: { [key: string]: { [key: string]: string[] } } = {
  "gluten-free": {
    "pasta": ["gluten-free pasta", "rice noodles", "quinoa"],
    "flour": ["almond flour", "coconut flour", "rice flour"],
    "bread": ["gluten-free bread", "lettuce wraps"],
    "soy sauce": ["tamari", "coconut aminos"]
  },
  "vegan": {
    "cheese": ["vegan cheese", "nutritional yeast"],
    "milk": ["almond milk", "soy milk", "oat milk"],
    "butter": ["vegan butter", "coconut oil"],
    "eggs": ["flax eggs", "aquafaba"],
    "meat": ["tofu", "tempeh", "seitan", "mushrooms"]
  },
  "dairy-free": {
    "milk": ["almond milk", "soy milk", "oat milk"],
    "cheese": ["dairy-free cheese", "nutritional yeast"],
    "butter": ["dairy-free butter", "coconut oil"],
    "yogurt": ["coconut yogurt", "almond yogurt"]
  },
  "low-carb": {
    "pasta": ["zucchini noodles", "spaghetti squash"],
    "rice": ["cauliflower rice"],
    "bread": ["lettuce wraps", "portobello mushroom caps"],
    "potatoes": ["turnips", "radishes"]
  }
};

export function getSubstitutions(dietary: string[], ingredient: string): string[] {
  const substitutes: string[] = [];
  dietary.forEach(diet => {
    if (SUBSTITUTIONS[diet] && SUBSTITUTIONS[diet][ingredient.toLowerCase()]) {
      substitutes.push(...SUBSTITUTIONS[diet][ingredient.toLowerCase()]);
    }
  });
  return Array.from(new Set(substitutes)); // Remove duplicates
}

class EnhancedMemorySystem {
  private db: Database.Database;
  private embeddings: OpenAIEmbeddings | null = null;
  private initialized: boolean = false;

  constructor() {
    const dbPath = path.join(process.cwd(), 'enhanced_memory.db');
    this.db = new Database(dbPath);
    this.initializeDatabase();
    this.initializeEmbeddings();
  }

  private initializeDatabase(): void {
    try {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS semantic_memory (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          namespace TEXT,
          content TEXT,
          timestamp TEXT,
          type TEXT DEFAULT 'semantic'
        )
      `);

      this.db.exec(`
        CREATE TABLE IF NOT EXISTS episodic_memory (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          namespace TEXT,
          content TEXT,
          timestamp TEXT,
          type TEXT DEFAULT 'episodic',
          context TEXT
        )
      `);

      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_semantic_user_namespace ON semantic_memory(user_id, namespace);
        CREATE INDEX IF NOT EXISTS idx_episodic_user_namespace ON episodic_memory(user_id, namespace);
      `);

      this.initialized = true;
      console.log('Enhanced memory database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize memory database:', error);
      this.initialized = false;
    }
  }

  private async initializeEmbeddings(): Promise<void> {
    try {
      if (process.env.OPENAI_API_KEY) {
        this.embeddings = new OpenAIEmbeddings({
          openAIApiKey: process.env.OPENAI_API_KEY,
        });
      }
    } catch (error) {
      console.error('Failed to initialize embeddings:', error);
    }
  }

  // Extract and save semantic preferences
  async extractAndSavePreferences(userId: string, text: string, namespaceTemplate: string = 'agent_memories/{user_id}'): Promise<{
    newDislikes: string[];
    newLikes: string[];
    newCuisines: string[];
    newDietary: string[];
  }> {
    const lowerText = text.toLowerCase();
    const result = {
      newDislikes: [] as string[],
      newLikes: [] as string[],
      newCuisines: [] as string[],
      newDietary: [] as string[]
    };
    const namespace = namespaceTemplate.replace('{user_id}', userId);

    // Extract dislikes
    const dislikePatterns = [
      /i don't like ([^,.!?]+)/g,
      /i hate ([^,.!?]+)/g,
      /no ([^,.!?]+)/g,
      /not a fan of ([^,.!?]+)/g,
      /avoid ([^,.!?]+)/g,
      /allergic to ([^,.!?]+)/g,
      /can't eat ([^,.!?]+)/g
    ];

    for (const pattern of dislikePatterns) {
      let match;
      while ((match = pattern.exec(lowerText)) !== null) {
        const disliked = match[1].trim();
        const existingMemories = await this.searchMemories(userId, `dislike ${disliked}`, namespace, 'semantic');
        
        if (!existingMemories.memories?.some(m => m.content.includes(disliked))) {
          await this.saveMemory(userId, `User dislikes ${disliked}`, namespace, 'semantic');
          result.newDislikes.push(disliked);
        }
      }
    }

    // Extract likes
    const likePatterns = [
      /i love ([^,.!?]+)/g,
      /i really like ([^,.!?]+)/g,
      /my favorite is ([^,.!?]+)/g,
      /i enjoy ([^,.!?]+)/g
    ];

    for (const pattern of likePatterns) {
      let match;
      while ((match = pattern.exec(lowerText)) !== null) {
        const liked = match[1].trim();
        const existingMemories = await this.searchMemories(userId, `like ${liked}`, namespace, 'semantic');
        
        if (!existingMemories.memories?.some(m => m.content.includes(liked))) {
          await this.saveMemory(userId, `User likes ${liked}`, namespace, 'semantic');
          result.newLikes.push(liked);
        }
      }
    }

    // Extract cuisine preferences
    const cuisineTypes = ['italian', 'asian', 'chinese', 'japanese', 'mexican', 'indian', 'thai', 'mediterranean', 'french', 'american', 'korean', 'vietnamese', 'greek', 'spanish', 'turkish'];
    for (const cuisine of cuisineTypes) {
      if (lowerText.includes(cuisine)) {
        const existingMemories = await this.searchMemories(userId, `cuisine ${cuisine}`, namespace, 'semantic');
        
        if (!existingMemories.memories?.some(m => m.content.includes(cuisine))) {
          await this.saveMemory(userId, `User prefers ${cuisine} cuisine`, namespace, 'semantic');
          result.newCuisines.push(cuisine);
        }
      }
    }

    // Extract dietary restrictions
    const dietaryTerms = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'keto', 'paleo', 'low-carb'];
    for (const dietary of dietaryTerms) {
      if (lowerText.includes(dietary) || lowerText.includes(dietary.replace('-', ' '))) {
        const existingMemories = await this.searchMemories(userId, `dietary ${dietary}`, namespace, 'semantic');
        
        if (!existingMemories.memories?.some(m => m.content.includes(dietary))) {
          await this.saveMemory(userId, `User has ${dietary} dietary restriction`, namespace, 'semantic');
          result.newDietary.push(dietary);
        }
      }
    }

    return result;
  }

  // Save a memory (semantic or episodic)
  async saveMemory(userId: string, content: string, namespace: string, type: 'semantic' | 'episodic' | 'takeaway'): Promise<MemoryResult> {
    try {
      const id = uuidv4();
      const timestamp = new Date().toISOString();

      if (type === 'semantic' || type === 'takeaway') {
        const stmt = this.db.prepare(`
          INSERT INTO semantic_memory (id, user_id, namespace, content, timestamp, type)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        stmt.run(id, userId, namespace, content, timestamp, type);
      } else {
        const stmt = this.db.prepare(`
          INSERT INTO episodic_memory (id, user_id, namespace, content, timestamp, type)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        stmt.run(id, userId, namespace, content, timestamp, type);
      }

      return { status: 'success', message: `Saved ${type} memory: ${content}` };
    } catch (error) {
      console.error(`Failed to save ${type} memory:`, error);
      return { status: 'error', message: `Failed to save ${type} memory: ${error}` };
    }
  }

  // Save an episodic memory (conversation)
  async saveEpisode(userId: string, conversation: ConversationEpisode, namespace: string = 'agent_memories/{user_id}'): Promise<MemoryResult> {
    const namespaceResolved = namespace.replace('{user_id}', userId);
    const episodeContent = `User said: "${conversation.user}" | Assistant replied: "${conversation.assistant}"`;
    
    try {
      const id = uuidv4();
      const stmt = this.db.prepare(`
        INSERT INTO episodic_memory (id, user_id, namespace, content, timestamp, type, context)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(id, userId, namespaceResolved, episodeContent, conversation.timestamp, 'episodic', JSON.stringify(conversation.context || {}));
      
      return { status: 'success', message: 'Saved conversation episode' };
    } catch (error) {
      console.error('Failed to save episode:', error);
      return { status: 'error', message: `Failed to save episode: ${error}` };
    }
  }

  // Search memories using text matching (with optional semantic similarity if embeddings available)
  async searchMemories(userId: string, query: string, namespace: string, type: 'semantic' | 'episodic' | 'all' = 'all', limit: number = 5): Promise<MemoryResult> {
    try {
      const memories: MemoryEntry[] = [];

      if (type === 'semantic' || type === 'all') {
        const stmt = this.db.prepare(`
          SELECT * FROM semantic_memory 
          WHERE user_id = ? AND namespace = ? AND content LIKE ?
          ORDER BY timestamp DESC LIMIT ?
        `);
        const rows = stmt.all(userId, namespace, `%${query}%`, limit) as any[];
        memories.push(...rows.map(row => ({
          id: row.id,
          user_id: row.user_id,
          namespace: row.namespace,
          content: row.content,
          timestamp: row.timestamp,
          type: row.type
        })));
      }

      if (type === 'episodic' || type === 'all') {
        const stmt = this.db.prepare(`
          SELECT * FROM episodic_memory 
          WHERE user_id = ? AND namespace = ? AND content LIKE ?
          ORDER BY timestamp DESC LIMIT ?
        `);
        const rows = stmt.all(userId, namespace, `%${query}%`, limit) as any[];
        memories.push(...rows.map(row => ({
          id: row.id,
          user_id: row.user_id,
          namespace: row.namespace,
          content: row.content,
          timestamp: row.timestamp,
          type: row.type
        })));
      }

      return {
        status: 'success',
        memories: memories.slice(0, limit)
      };
    } catch (error) {
      console.error('Search memories failed:', error);
      return {
        status: 'error',
        message: `Failed to search memories: ${error}`,
        memories: []
      };
    }
  }

  // Get organized user profile from semantic memory
  async getUserProfile(userId: string, namespace: string = 'agent_memories/{user_id}'): Promise<UserProfile> {
    const namespaceResolved = namespace.replace('{user_id}', userId);
    
    const profile: UserProfile = {
      dislikes: [],
      likes: [],
      cuisines: [],
      dietary: []
    };

    try {
      const stmt = this.db.prepare(`
        SELECT content FROM semantic_memory 
        WHERE user_id = ? AND namespace = ?
        ORDER BY timestamp DESC
      `);
      const rows = stmt.all(userId, namespaceResolved) as any[];

      rows.forEach(row => {
        const content = row.content;
        
        const dislikeMatch = content.match(/User dislikes (.+)/);
        if (dislikeMatch && !profile.dislikes.includes(dislikeMatch[1])) {
          profile.dislikes.push(dislikeMatch[1]);
        }

        const likeMatch = content.match(/User likes (.+)/);
        if (likeMatch && !profile.likes.includes(likeMatch[1])) {
          profile.likes.push(likeMatch[1]);
        }

        const cuisineMatch = content.match(/User prefers (.+) cuisine/);
        if (cuisineMatch && !profile.cuisines.includes(cuisineMatch[1])) {
          profile.cuisines.push(cuisineMatch[1]);
        }

        const dietaryMatch = content.match(/User has (.+) dietary restriction/);
        if (dietaryMatch && !profile.dietary.includes(dietaryMatch[1])) {
          profile.dietary.push(dietaryMatch[1]);
        }
      });

    } catch (error) {
      console.error('Failed to get user profile:', error);
    }

    return profile;
  }

  // Apply procedural memory rules for recipe interactions
  applyProceduralMemoryRules(userQuery: string, userProfile: UserProfile, pastEpisodes: MemoryEntry[]): {
    shouldConfirmDietary: boolean;
    shouldPersonalizeByHistory: boolean;
    shouldOfferAlternatives: boolean;
    shouldAskForClarification: boolean;
    tone: string;
    recommendations: string[];
  } {
    const lowerQuery = userQuery.toLowerCase();
    const result = {
      shouldConfirmDietary: false,
      shouldPersonalizeByHistory: false,
      shouldOfferAlternatives: false,
      shouldAskForClarification: false,
      tone: 'friendly and culinary-focused',
      recommendations: [] as string[]
    };

    // Rule 1 & 3: Use past recipe interactions
    if (pastEpisodes.some(ep => ep.content.includes('recipe'))) {
      result.shouldPersonalizeByHistory = true;
      result.recommendations.push("Reference your past recipe preferences");
    }

    // Rule 2: Confirm dietary preferences
    if (lowerQuery.includes('recipe') && userProfile.dietary.length === 0) {
      result.shouldConfirmDietary = true;
      result.recommendations.push("Ask about dietary restrictions before suggesting recipes");
    }

    // Rule 4: Provide substitutions
    if (userProfile.dietary.length > 0) {
      result.recommendations.push(`Include ${userProfile.dietary.join(' and ')} substitutions in recipes`);
    }

    // Rule 5: Ask for clarification
    if (lowerQuery.includes('recipe') && !lowerQuery.includes('cuisine') && userProfile.cuisines.length === 0) {
      result.shouldAskForClarification = true;
      result.recommendations.push("Ask about preferred cuisine type");
    }

    // Rule 8: Offer alternatives
    if (lowerQuery.includes('no') || lowerQuery.includes('not') || lowerQuery.includes('different')) {
      result.shouldOfferAlternatives = true;
      result.recommendations.push("Prepare alternative recipe suggestions");
    }

    // Rule 7: Summarize feedback
    const feedbackEpisodes = pastEpisodes.filter(ep => 
      ep.content.includes('like') || ep.content.includes('love') || ep.content.includes('hate') || ep.content.includes('dislike')
    );
    if (feedbackEpisodes.length > 0) {
      result.recommendations.push("Consider past feedback when suggesting recipes");
    }

    return result;
  }

  // Save takeaway from conversation
  async saveTakeaway(userId: string, takeaway: string, namespace: string = 'agent_memories/{user_id}'): Promise<MemoryResult> {
    const namespaceResolved = namespace.replace('{user_id}', userId);
    return await this.saveMemory(userId, `Takeaway: ${takeaway}`, namespaceResolved, 'takeaway');
  }

  // Get relevant context for current conversation
  async getConversationContext(userId: string, currentQuery: string, namespace: string = 'agent_memories/{user_id}'): Promise<{
    userProfile: UserProfile;
    relevantEpisodes: MemoryEntry[];
    proceduralGuidance: any;
    semanticContext: MemoryEntry[];
  }> {
    const namespaceResolved = namespace.replace('{user_id}', userId);
    
    // Get user profile
    const userProfile = await this.getUserProfile(userId, namespace);
    
    // Get relevant past episodes
    const episodeResult = await this.searchMemories(userId, currentQuery, namespaceResolved, 'episodic', 5);
    const relevantEpisodes = episodeResult.memories || [];
    
    // Get semantic context
    const semanticResult = await this.searchMemories(userId, currentQuery, namespaceResolved, 'semantic', 10);
    const semanticContext = semanticResult.memories || [];
    
    // Apply procedural memory rules
    const proceduralGuidance = this.applyProceduralMemoryRules(currentQuery, userProfile, relevantEpisodes);
    
    return {
      userProfile,
      relevantEpisodes,
      proceduralGuidance,
      semanticContext
    };
  }
}

// ===============================
// CONVERSATIONAL AGENT
// ===============================

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
- NEVER include full recipe details in your text response when recipes are generated separately

Remember: You're not just answering individual questions - you're having an ongoing conversation with someone who trusts you to remember their preferences and provide increasingly personalized assistance.`);
};

export class ConversationalAgent {
  private memorySystem: EnhancedMemorySystem;
  
  constructor() {
    this.memorySystem = new EnhancedMemorySystem();
  }
  
  async processConversation(userId: string, userMessage: string, fridgeIngredients: string[] = []): Promise<ConversationalResponse> {
    // Get or create conversation session
    if (!conversationSessions.has(userId)) {
      conversationSessions.set(userId, []);
    }
    
    const messages = conversationSessions.get(userId)!;
    
    // Get enhanced conversation context
    const conversationContext = await this.memorySystem.getConversationContext(userId, userMessage);
    const { userProfile, relevantEpisodes, proceduralGuidance, semanticContext } = conversationContext;
    
    // Extract and save new preferences
    const learningResult = await this.memorySystem.extractAndSavePreferences(userId, userMessage);
    
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
      
      // Apply dietary substitutions
      const enhancedIngredients = [...availableIngredients];
      availableIngredients.forEach(ingredient => {
        const substitutes = getSubstitutions(userProfile.dietary, ingredient);
        if (substitutes.length > 0) {
          enhancedIngredients.push(`${ingredient} (or substitute: ${substitutes.slice(0, 2).join(', ')})`);
        }
      });
      
      // Extract parameters from message
      const peopleMatch = userMessage.match(/(\d+)\s*(people|person|servings?)/i);
      const num_people = peopleMatch ? parseInt(peopleMatch[1]) : 2;
      
      // Generate sample recipes (replace with your actual recipe generation logic)
      recipes = await this.generateSampleRecipes(enhancedIngredients, userProfile, num_people);
      
      suggestions = [
        "Save recipes you like to build your collection",
        "Tell me your feedback to improve future suggestions", 
        "Ask for variations or alternative recipes",
        "Share more preferences to enhance personalization"
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
      const recipeNote = new HumanMessage(`[SYSTEM NOTE: ${recipes.length} personalized recipes have been generated based on your preferences and will be displayed in recipe cards. Please acknowledge this without repeating the recipe details.]`);
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
    await this.memorySystem.saveEpisode(userId, {
      user: userMessage,
      assistant: response.content,
      timestamp: new Date().toISOString(),
      context: {
        conversationLength: messages.length,
        recipesGenerated: recipes.length,
        proceduralGuidance: proceduralGuidance.recommendations,
        learningsCount: allNewLearnings.length
      }
    });
    
    // Save important takeaways
    if (allNewLearnings.length > 0) {
      await this.memorySystem.saveTakeaway(userId, `User expressed new preferences: ${allNewLearnings.join(', ')}`);
    }
    
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
  
  // Sample recipe generation (replace with your actual implementation)
  private async generateSampleRecipes(ingredients: string[], userProfile: UserProfile, servings: number): Promise<GeneratedRecipe[]> {
    // This is a simplified example - replace with your actual recipe generation logic
    const sampleRecipes: GeneratedRecipe[] = [
      {
        title: `Personalized ${userProfile.cuisines[0] || 'International'} Dish`,
        ingredients: ingredients.slice(0, 5).concat(['salt', 'pepper', 'olive oil']),
        instructions: [
          'Prepare all ingredients',
          'Cook according to dietary preferences',
          'Season to taste',
          'Serve hot'
        ],
        cookTime: '30 mins',
        servings: servings,
        source: 'AI Generated'
      }
    ];
    
    return sampleRecipes;
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

// ===============================
// USAGE EXAMPLE
// ===============================

/*
// Example usage:
const agent = new ConversationalAgent();

// Start a conversation
const response = await agent.processConversation(
  'user-123', 
  'I love Italian food but I hate tomatoes. Can you make me some recipes?',
  ['pasta', 'cheese', 'basil', 'garlic', 'onion']
);

console.log('AI Response:', response.message);
console.log('Generated Recipes:', response.recipes);
console.log('User Preferences Learned:', response.userPreferences);
console.log('Reasoning Steps:', response.reasoning);

// Continue the conversation
const response2 = await agent.processConversation(
  'user-123',
  'I also follow a vegetarian diet',
  ['pasta', 'cheese', 'basil', 'garlic', 'onion']
);

// The agent will remember the previous preferences and add the new dietary restriction
*/

// Create singleton instance
export const conversationalAgent = new ConversationalAgent();
export const enhancedMemorySystem = new EnhancedMemorySystem();