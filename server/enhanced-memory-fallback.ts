import Database from 'better-sqlite3';
import { OpenAIEmbeddings } from '@langchain/openai';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Interface for memory entries
interface MemoryEntry {
  id: string;
  user_id: string;
  namespace: string;
  content: string;
  timestamp: string;
  type: 'semantic' | 'episodic' | 'takeaway';
  similarity_score?: number;
}

// Interface for tool results
interface MemoryResult {
  status: 'success' | 'error';
  message?: string;
  memories?: MemoryEntry[];
}

// Interface for user profile
interface UserProfile {
  dislikes: string[];
  likes: string[];
  cuisines: string[];
  dietary: string[];
}

// Interface for conversation episode
interface ConversationEpisode {
  user: string;
  assistant: string;
  timestamp: string;
  context?: any;
}

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

      console.log(`Getting user profile for ${userId}, namespace: ${namespaceResolved}, found ${rows.length} memories`);

      rows.forEach(row => {
        const content = row.content;
        console.log(`Processing memory: ${content}`);
        
        const dislikeMatch = content.match(/User dislikes (.+)/);
        if (dislikeMatch && !profile.dislikes.includes(dislikeMatch[1])) {
          profile.dislikes.push(dislikeMatch[1]);
          console.log(`Added dislike: ${dislikeMatch[1]}`);
        }

        const likeMatch = content.match(/User likes (.+)/);
        if (likeMatch && !profile.likes.includes(likeMatch[1])) {
          profile.likes.push(likeMatch[1]);
          console.log(`Added like: ${likeMatch[1]}`);
        }

        const cuisineMatch = content.match(/User prefers (.+) cuisine/);
        if (cuisineMatch && !profile.cuisines.includes(cuisineMatch[1])) {
          profile.cuisines.push(cuisineMatch[1]);
          console.log(`Added cuisine: ${cuisineMatch[1]}`);
        }

        const dietaryMatch = content.match(/User has (.+) dietary restriction/);
        if (dietaryMatch && !profile.dietary.includes(dietaryMatch[1])) {
          profile.dietary.push(dietaryMatch[1]);
          console.log(`Added dietary: ${dietaryMatch[1]}`);
        }
      });

      console.log(`Final profile: dislikes=${profile.dislikes.length}, likes=${profile.likes.length}, cuisines=${profile.cuisines.length}, dietary=${profile.dietary.length}`);

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

// Ingredient substitution system (keeping from original)
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

// Create singleton instance
export const enhancedMemorySystem = new EnhancedMemorySystem();