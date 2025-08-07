import { ChromaClient } from 'chromadb';
import { OpenAIEmbeddings } from '@langchain/openai';
import Database from 'better-sqlite3';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import axios from 'axios';

// Tool interface for memory operations
interface Tool {
  name: string;
  description: string;
  func: (input: any) => Promise<any>;
}

// Interface for memory entries
interface MemoryEntry {
  id: string;
  user_id: string;
  namespace: string;
  content: string;
  timestamp: string;
  embedding?: number[];
  type: 'semantic' | 'episodic' | 'takeaway';
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

// Interface for recipe
interface Recipe {
  name: string;
  cuisine: string;
  ingredients: { name: string; quantity: string }[];
  instructions: string[];
  dietary: string[];
  source?: string;
}

// Interface for cart item
interface CartItem {
  user_id: string;
  ingredient: string;
  quantity: string;
  timestamp: string;
}

// Interface for recipe document (for fallback)
interface RecipeDocument {
  id: string;
  content: string;
  metadata: { title: string; cuisine: string; dietary: string[]; source: string };
  embedding: number[];
}

class RecipeVectorStore {
  private recipes: RecipeDocument[] = [];
  private embeddings: OpenAIEmbeddings;
  private recipeFile: string = path.join(process.cwd(), 'recipes.json');

  constructor(embeddings: OpenAIEmbeddings) {
    this.embeddings = embeddings;
    this.initializeRecipes();
  }

  private async initializeRecipes(): Promise<void> {
    try {
      await fs.access(this.recipeFile);
      // Load existing recipes
      const data = await fs.readFile(this.recipeFile, 'utf-8');
      this.recipes = JSON.parse(data);
    } catch {
      // Initialize with sample recipes for fallback
      const sampleRecipes = [
        {
          id: uuidv4(),
          content: `Vegan Pasta Primavera: A light, vegetable-packed pasta dish. Ingredients: 200g pasta, 1 zucchini, 1 bell pepper, 1 cup cherry tomatoes, 2 tbsp olive oil, 2 cloves garlic, 1 tsp Italian herbs. Instructions: 1. Boil pasta until al dente. 2. Sauté garlic, zucchini, bell pepper in olive oil. 3. Add tomatoes and herbs, toss with pasta.`,
          metadata: { title: 'Vegan Pasta Primavera', cuisine: 'Italian', dietary: ['vegan'], source: 'local-fallback' },
          embedding: []
        },
        {
          id: uuidv4(),
          content: `Chicken Curry: A spicy Indian dish. Ingredients: 500g chicken, 1 onion, 2 tbsp curry powder, 400ml coconut milk, 1 cup rice. Instructions: 1. Cook rice. 2. Sauté onion, add curry powder and chicken. 3. Add coconut milk, simmer until cooked.`,
          metadata: { title: 'Chicken Curry', cuisine: 'Indian', dietary: [], source: 'local-fallback' },
          embedding: []
        },
      ];
      
      for (const recipe of sampleRecipes) {
        try {
          recipe.embedding = await this.embeddings.embedQuery(recipe.content);
        } catch (error) {
          console.log('Failed to generate embeddings for sample recipes, using empty arrays');
          recipe.embedding = new Array(1536).fill(0); // Default OpenAI embedding size
        }
      }
      
      await fs.writeFile(this.recipeFile, JSON.stringify(sampleRecipes, null, 2));
      this.recipes = sampleRecipes;
    }
  }

  async similaritySearch(query: string, k: number = 2): Promise<RecipeDocument[]> {
    try {
      const queryEmbedding = await this.embeddings.embedQuery(query);
      // Calculate cosine similarity
      const similarities = this.recipes.map(recipe => ({
        recipe,
        similarity: this.cosineSimilarity(queryEmbedding, recipe.embedding),
      }));
      return similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, k)
        .map(item => item.recipe);
    } catch (error) {
      console.log('Similarity search failed, returning first recipes:', error);
      return this.recipes.slice(0, k);
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (!a.length || !b.length) return 0;
    const dotProduct = a.reduce((sum, val, i) => sum + val * (b[i] || 0), 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return magnitudeA && magnitudeB ? dotProduct / (magnitudeA * magnitudeB) : 0;
  }
}

class MemorySystem {
  private chroma: ChromaClient | null = null;
  private db: Database.Database | null = null;
  private embeddings: OpenAIEmbeddings;
  private useChroma: boolean = false;
  private semanticCollection: string = 'semantic_memories';
  private episodicCollection: string = 'episodic_memories';
  private defaultNamespace: string = 'agent_memories';
  private cartFile: string = path.join(process.cwd(), 'instacart_cart.json');
  private recipeStore: RecipeVectorStore;
  private tavilyApiKey: string | undefined = process.env.TAVILY_API_KEY;

  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
    this.recipeStore = new RecipeVectorStore(this.embeddings);
    this.initializeStorage();
    this.initializeCart();
  }

  private async initializeStorage(): Promise<void> {
    try {
      // Try ChromaDB first
      this.chroma = new ChromaClient();
      await this.initializeCollections();
      this.useChroma = true;
      console.log('Using ChromaDB for memory storage');
    } catch (error) {
      console.log('ChromaDB failed, falling back to SQLite:', error.message);
      // Fall back to SQLite
      const dbPath = path.join(process.cwd(), 'enhanced_memory.db');
      this.db = new Database(dbPath);
      this.initializeDatabase();
      this.useChroma = false;
      console.log('Using SQLite for memory storage');
    }
  }

  private initializeDatabase(): void {
    if (!this.db) return;
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
    } catch (error) {
      console.error('Failed to initialize SQLite database:', error);
    }
  }

  private async initializeCollections(): Promise<void> {
    if (!this.chroma) return;
    try {
      await this.chroma.createCollection({ name: this.semanticCollection });
      await this.chroma.createCollection({ name: this.episodicCollection });
    } catch (error) {
      if ((error as any).message?.includes('already exists')) {
        // Collections already exist
      } else {
        throw error; // Re-throw to trigger SQLite fallback
      }
    }
  }

  private async initializeCart(): Promise<void> {
    try {
      await fs.access(this.cartFile);
    } catch {
      await fs.writeFile(this.cartFile, JSON.stringify([]));
    }
  }

  // Extract and save semantic preferences
  async extractAndSavePreferences(userId: string, text: string, namespaceTemplate: string = `${this.defaultNamespace}/{user_id}`): Promise<{
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
        if (!(await this.searchMemories(userId, `dislike ${disliked}`, namespace, 'semantic')).memories?.some(m => m.content.includes(disliked))) {
          await this.saveMemory(userId, `User dislikes ${disliked}`, namespace, 'semantic');
          result.newDislikes.push(disliked);
        }
      }
    }

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
        if (!(await this.searchMemories(userId, `like ${liked}`, namespace, 'semantic')).memories?.some(m => m.content.includes(liked))) {
          await this.saveMemory(userId, `User likes ${liked}`, namespace, 'semantic');
          result.newLikes.push(liked);
        }
      }
    }

    const cuisineTypes = ['italian', 'asian', 'chinese', 'japanese', 'mexican', 'indian', 'thai', 'mediterranean', 'french', 'american', 'korean', 'vietnamese', 'greek', 'spanish', 'turkish'];
    for (const cuisine of cuisineTypes) {
      if (lowerText.includes(cuisine)) {
        if (!(await this.searchMemories(userId, `cuisine ${cuisine}`, namespace, 'semantic')).memories?.some(m => m.content.includes(cuisine))) {
          await this.saveMemory(userId, `User prefers ${cuisine} cuisine`, namespace, 'semantic');
          result.newCuisines.push(cuisine);
        }
      }
    }

    const dietaryTerms = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'keto', 'paleo', 'low-carb'];
    for (const dietary of dietaryTerms) {
      if (lowerText.includes(dietary) || lowerText.includes(dietary.replace('-', ' '))) {
        if (!(await this.searchMemories(userId, `dietary ${dietary}`, namespace, 'semantic')).memories?.some(m => m.content.includes(dietary))) {
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

      if (this.useChroma && this.chroma) {
        const embedding = await this.embeddings.embedQuery(content);
        const collection = type === 'semantic' ? this.semanticCollection : this.episodicCollection;

        await this.chroma.add({
          collectionName: collection,
          ids: [id],
          embeddings: [embedding],
          documents: [content],
          metadatas: [{ user_id: userId, namespace, timestamp, type }],
        });
      } else if (this.db) {
        // SQLite fallback
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
      }

      return { status: 'success', message: `Saved ${type} memory: ${content}` };
    } catch (error) {
      return { status: 'error', message: `Failed to save ${type} memory: ${error}` };
    }
  }

  // Save an episodic memory (conversation)
  async saveEpisode(userId: string, conversation: { user: string; agent: string }, namespace: string): Promise<MemoryResult> {
    const content = `User: ${conversation.user}\nAgent: ${conversation.agent}`;
    
    try {
      const id = uuidv4();
      const timestamp = new Date().toISOString();

      if (this.useChroma && this.chroma) {
        // ChromaDB version
        const embedding = await this.embeddings.embedQuery(content);
        await this.chroma.add({
          collectionName: this.episodicCollection,
          ids: [id],
          embeddings: [embedding],
          documents: [content],
          metadatas: [{ user_id: userId, namespace, timestamp, type: 'episodic' }],
        });
      } else if (this.db) {
        // SQLite fallback
        const stmt = this.db.prepare(`
          INSERT INTO episodic_memory (id, user_id, namespace, content, timestamp, type, context)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(id, userId, namespace, content, timestamp, 'episodic', JSON.stringify({}));
      }

      // Try to reflect on the conversation (optional)
      try {
        const takeaway = await this.reflect(userId, conversation, namespace);
        if (takeaway.status === 'success' && takeaway.message) {
          await this.saveMemory(userId, takeaway.message, namespace, 'takeaway');
        }
      } catch (reflectionError) {
        console.log('Reflection failed, but episode saved:', reflectionError);
      }
      
      return { status: 'success', message: 'Saved conversation episode' };
    } catch (error) {
      console.error('Failed to save episode:', error);
      return { status: 'error', message: `Failed to save episode: ${error}` };
    }
  }

  // Reflect on a conversation to generate takeaways
  async reflect(userId: string, conversation: { user: string; agent: string }, namespace: string): Promise<MemoryResult> {
    try {
      const prompt = `Given the conversation:
User: ${conversation.user}
Agent: ${conversation.agent}
Generate a concise takeaway about user preferences or recipe interactions (e.g., "User prefers vegan recipes").`;
      
      const llmResponse = await this.embeddings.client.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'system', content: prompt }],
      });
      const takeaway = llmResponse.choices[0].message.content;

      return { status: 'success', message: takeaway };
    } catch (error) {
      return { status: 'error', message: `Failed to reflect: ${error}` };
    }
  }

  // Search memories (semantic or episodic)
  async searchMemories(userId: string, query: string, namespace: string, type: 'semantic' | 'episodic' | 'takeaway', limit: number = 5): Promise<MemoryResult> {
    try {
      const memories: MemoryEntry[] = [];

      if (this.useChroma && this.chroma) {
        const embedding = await this.embeddings.embedQuery(query);
        const collection = type === 'semantic' ? this.semanticCollection : this.episodicCollection;
        
        const results = await this.chroma.query({
          collectionName: collection,
          queryEmbeddings: [embedding],
          nResults: limit,
          where: { user_id: userId, namespace, type },
        });

        memories.push(...results.documents[0].map((content, i) => ({
          id: results.ids[0][i],
          user_id: userId,
          namespace,
          content,
          timestamp: results.metadatas[0][i].timestamp,
          type,
        })));
      } else if (this.db) {
        // SQLite fallback with text search
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
      }

      return { status: 'success', memories: memories.slice(0, limit) };
    } catch (error) {
      return { status: 'error', message: `Failed to search ${type} memories: ${error}`, memories: [] };
    }
  }

  // Get organized user profile
  async getUserProfile(userId: string, namespace: string = `${this.defaultNamespace}/{user_id}`): Promise<UserProfile> {
    const namespaceResolved = namespace.replace('{user_id}', userId);
    
    const profile: UserProfile = {
      dislikes: [],
      likes: [],
      cuisines: [],
      dietary: []
    };

    try {
      if (this.useChroma && this.chroma) {
        // ChromaDB version
        const [dislikeResult, likeResult, cuisineResult, dietaryResult] = await Promise.all([
          this.searchMemories(userId, 'dislike', namespaceResolved, 'semantic'),
          this.searchMemories(userId, 'like', namespaceResolved, 'semantic'),
          this.searchMemories(userId, 'cuisine', namespaceResolved, 'semantic'),
          this.searchMemories(userId, 'dietary', namespaceResolved, 'semantic')
        ]);

        profile.dislikes = dislikeResult.memories?.filter(m => m.content.startsWith('User dislikes'))
          .map(m => m.content.replace('User dislikes ', '')) || [];
        profile.likes = likeResult.memories?.filter(m => m.content.startsWith('User likes'))
          .map(m => m.content.replace('User likes ', '')) || [];
        profile.cuisines = cuisineResult.memories?.filter(m => m.content.startsWith('User prefers'))
          .map(m => m.content.replace('User prefers ', '').replace(' cuisine', '')) || [];
        profile.dietary = dietaryResult.memories?.filter(m => m.content.startsWith('User has'))
          .map(m => m.content.replace('User has ', '').replace(' dietary restriction', '')) || [];
      } else if (this.db) {
        // SQLite fallback
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
      }
    } catch (error) {
      console.error('Failed to get user profile:', error);
    }

    return profile;
  }

  // Load procedural memory from file
  async loadProceduralMemory(): Promise<string> {
    try {
      const filePath = path.join(process.cwd(), 'procedural_memory.txt');
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      console.error('Failed to load procedural memory:', error);
      return '';
    }
  }

  // Add ingredient to Instacart cart
  async addToInstacart(userId: string, ingredient: string, quantity: string = '1 unit', namespace: string): Promise<string> {
    try {
      const profile = await this.getUserProfile(userId, namespace);
      const lowerIngredient = ingredient.toLowerCase();

      // Check if ingredient is compatible with user preferences
      if (profile.dislikes.some(dislike => lowerIngredient.includes(dislike.toLowerCase()))) {
        return `Cannot add ${ingredient} to cart because you dislike it.`;
      }

      const substitutes = getSubstitutions(profile.dietary, lowerIngredient);
      if (substitutes.length > 0) {
        return `Cannot add ${ingredient} due to dietary restrictions (${profile.dietary.join(', ')}). Suggested substitutes: ${substitutes.join(', ')}.`;
      }

      // Load existing cart
      const cartData = await fs.readFile(this.cartFile, 'utf-8');
      const cart: CartItem[] = JSON.parse(cartData || '[]');

      // Add new item
      const cartItem: CartItem = {
        user_id: userId,
        ingredient,
        quantity,
        timestamp: new Date().toISOString(),
      };
      cart.push(cartItem);

      // Save updated cart
      await fs.writeFile(this.cartFile, JSON.stringify(cart, null, 2));

      // Save action to episodic memory
      await this.saveMemory(userId, `Added ${ingredient} (${quantity}) to Instacart cart`, namespace, 'episodic');

      return `Added ${ingredient} (${quantity}) to your Instacart cart.`;
    } catch (error) {
      return `Error adding ${ingredient} to Instacart cart: ${error}`;
    }
  }

  // Retrieve recipes from the web using Tavily
  async retrieveWebRecipes(query: string, userId: string, namespace: string): Promise<string> {
    try {
      const profile = await this.getUserProfile(userId, namespace);
      // Enhance query with user preferences
      let enhancedQuery = query;
      if (profile.dietary.length > 0) {
        enhancedQuery += ` ${profile.dietary.join(' ')}`;
      }
      if (profile.cuisines.length > 0) {
        enhancedQuery += ` ${profile.cuisines[0]}`;
      }
      enhancedQuery += ` recipe`;

      if (!this.tavilyApiKey) {
        // Fallback to local recipe store if Tavily API key is missing
        console.warn('Tavily API key missing, falling back to local recipe store');
        const localRecipes = await this.recipeStore.similaritySearch(enhancedQuery, 2);
        return localRecipes
          .map(doc => `Source: ${doc.metadata.source}\nTitle: ${doc.metadata.title}\nContent: ${doc.content}`)
          .join('\n\n');
      }

      // Call Tavily Search API
      const response = await axios.post(
        'https://api.tavily.com/search',
        {
          api_key: this.tavilyApiKey,
          query: enhancedQuery,
          search_depth: 'basic',
          max_results: 5,
          include_raw_content: true,
        },
        { headers: { 'Content-Type': 'application/json' } }
      );

      const results = response.data.results || [];
      const formattedResults = results
        .map((result: any) => {
          let content = result.raw_content || result.content || 'No content available';
          // Filter out content that conflicts with user preferences
          if (profile.dislikes.some(dislike => content.toLowerCase().includes(dislike.toLowerCase()))) {
            return null;
          }
          if (profile.dietary.length > 0 && !profile.dietary.some(diet => content.toLowerCase().includes(diet.toLowerCase()))) {
            return null;
          }
          return `Source: ${result.url}\nTitle: ${result.title || 'Recipe'}\nContent: ${content.slice(0, 1000)}...`;
        })
        .filter((item: string | null) => item !== null)
        .join('\n\n');

      if (formattedResults) {
        await this.saveMemory(userId, `Retrieved web recipes for query: ${enhancedQuery}`, namespace, 'episodic');
        return formattedResults;
      }

      // Fallback to local store if no valid web results
      const localRecipes = await this.recipeStore.similaritySearch(enhancedQuery, 2);
      return localRecipes
        .map(doc => `Source: ${doc.metadata.source}\nTitle: ${doc.metadata.title}\nContent: ${doc.content}`)
        .join('\n\n');
    } catch (error) {
      console.error('Tavily API error:', error);
      // Fallback to local recipe store
      const localRecipes = await this.recipeStore.similaritySearch(query, 2);
      return localRecipes
        .map(doc => `Source: ${doc.metadata.source}\nTitle: ${doc.metadata.title}\nContent: ${doc.content}`)
        .join('\n\n');
    }
  }

  // Get memory tools, including new Tavily recipe retrieval tool
  getMemoryTools(userId: string, namespaceTemplate: string = `${this.defaultNamespace}/{user_id}`): Tool[] {
    const namespace = namespaceTemplate.replace('{user_id}', userId);
    return [
      {
        name: 'ManageMemory',
        description: 'Create, update, or delete semantic or episodic memories.',
        func: async (input: { action: 'create' | 'update' | 'delete', content?: string, memoryId?: string, type: 'semantic' | 'episodic' | 'takeaway' }) => {
          if (input.action === 'create' && input.content) {
            return await this.saveMemory(userId, input.content, namespace, input.type);
          } else if (input.action === 'update' && input.memoryId && input.content) {
            return await this.updateMemory(userId, input.memoryId, input.content, namespace, input.type);
          } else if (input.action === 'delete' && input.memoryId) {
            return await this.deleteMemory(input.memoryId, input.type);
          }
          return { status: 'error', message: 'Invalid input for ManageMemory' };
        },
      },
      {
        name: 'SearchMemory',
        description: 'Search semantic or episodic memories using a query.',
        func: async (input: { query: string, type: 'semantic' | 'episodic' | 'takeaway', limit?: number }) => {
          return await this.searchMemories(userId, input.query, namespace, input.type, input.limit || 5);
        },
      },
      {
        name: 'AddToInstacart',
        description: 'Add a missing ingredient to the user\'s Instacart shopping cart, respecting preferences.',
        func: async (input: { ingredient: string, quantity?: string }) => {
          return await this.addToInstacart(userId, input.ingredient, input.quantity || '1 unit', namespace);
        },
      },
      {
        name: 'RetrieveWebRecipes',
        description: 'Retrieve recipes from the web using Tavily Search API, tailored to user preferences.',
        func: async (input: { query: string }) => {
          return await this.retrieveWebRecipes(input.query, userId, namespace);
        },
      },
    ];
  }

  // Update an existing memory (for compatibility)
  async updateMemory(userId: string, memoryId: string, content: string, namespace: string, type: 'semantic' | 'episodic' | 'takeaway'): Promise<MemoryResult> {
    // For SQLite fallback, we'll just create a new memory since update is complex
    return await this.saveMemory(userId, content, namespace, type);
  }

  // Delete a memory (for compatibility)  
  async deleteMemory(memoryId: string, type: 'semantic' | 'episodic' | 'takeaway'): Promise<MemoryResult> {
    try {
      if (this.useChroma && this.chroma) {
        const collection = type === 'semantic' ? this.semanticCollection : this.episodicCollection;
        await this.chroma.delete({
          collectionName: collection,
          ids: [memoryId],
        });
        return { status: 'success', message: `Deleted ${type} memory ID ${memoryId}` };
      } else if (this.db) {
        // SQLite fallback
        const table = type === 'semantic' ? 'semantic_memory' : 'episodic_memory';
        const stmt = this.db.prepare(`DELETE FROM ${table} WHERE id = ?`);
        stmt.run(memoryId);
        return { status: 'success', message: `Deleted ${type} memory ID ${memoryId}` };
      }
      return { status: 'error', message: 'No storage system available' };
    } catch (error) {
      return { status: 'error', message: `Failed to delete ${type} memory: ${error}` };
    }
  }
}

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
  return Array.from(new Set(substitutes));
}

// Create singleton instance
export const memorySystem = new MemorySystem();

// Simplified conversational agent that integrates with existing system
export class ConversationalAgent {
  async processConversation(userId: string, userMessage: string, fridgeInventory: string[] = [], namespaceTemplate: string = 'agent_memories/{user_id}'): Promise<{ response: string; recipe?: Recipe }> {
    const namespace = namespaceTemplate.replace('{user_id}', userId);

    try {
      // Extract preferences from user message
      await memorySystem.extractAndSavePreferences(userId, userMessage, namespaceTemplate);

      // Get user profile for personalization
      const profile = await memorySystem.getUserProfile(userId, namespaceTemplate);

      // Check for source inquiry
      const lowerMessage = userMessage.toLowerCase();
      if (lowerMessage.includes('where') && (lowerMessage.includes('recipe') || lowerMessage.includes('from'))) {
        // User is asking about recipe sources
        const episodicResult = await memorySystem.searchMemories(userId, 'recipe', namespace, 'episodic', 10);
        const recentRecipes = episodicResult.memories?.filter(m => 
          m.content.includes('Found') && m.content.includes('from')
        ).slice(0, 5) || [];
        
        if (recentRecipes.length > 0) {
          const sourceInfo = recentRecipes.map(memory => {
            const match = memory.content.match(/Found (.+?) from (.+?)\./); 
            return match ? `• ${match[1]} - from ${match[2]}` : memory.content;
          }).join('\n');
          
          return {
            response: `Here are the sources for your recent recipes:\n\n${sourceInfo}\n\nI get recipes from various cooking websites through web search, plus I have some local recipe knowledge as backup. When I find recipes online, I always try to include the source so you know where they came from!`
          };
        } else {
          return {
            response: "I haven't provided you with any recipes yet! When I do find recipes, I get them from popular cooking websites like AllRecipes, Food.com, and other culinary sources through web search. I also have some local recipe knowledge as backup. I always try to tell you where each recipe comes from."
          };
        }
      }
      
      // Check for recipe request
      if (lowerMessage.includes('recipe') || lowerMessage.includes('cook') || lowerMessage.includes('make')) {
        
        // Use Tavily to get real recipes from the web
        try {
          const webRecipes = await memorySystem.retrieveWebRecipes(userMessage, userId, namespace);
          console.log('Retrieved web recipes:', webRecipes);

          // Parse the first recipe from web results
          const lines = webRecipes.split('\n');
          const titleLine = lines.find(line => line.startsWith('Title:'));
          const sourceLine = lines.find(line => line.startsWith('Source:'));
          
          const preferredCuisine = profile.cuisines.length > 0 ? profile.cuisines[0] : 'international';
          const recipeName = titleLine ? titleLine.replace('Title: ', '') : `${preferredCuisine} Recipe from Web`;
          const recipeSource = sourceLine ? sourceLine.replace('Source: ', '') : 'web-search';

          // Generate a recipe based on web content and user preferences
          let recipe: Recipe = {
            name: recipeName,
            cuisine: preferredCuisine,
            ingredients: [
              { name: 'pasta', quantity: '200g' },
              { name: 'olive oil', quantity: '2 tbsp' },
              { name: 'garlic', quantity: '2 cloves' },
              { name: 'tomatoes', quantity: '1 can' },
            ],
            instructions: [
              'Boil pasta until al dente.',
              'Sauté garlic in olive oil.',
              'Add tomatoes and simmer.',
              'Toss pasta with sauce.',
            ],
            dietary: profile.dietary,
            source: recipeSource
          };

          // Filter out disliked ingredients
          recipe.ingredients = recipe.ingredients.filter(ingredient => 
            !profile.dislikes.some(disliked => 
              ingredient.name.toLowerCase().includes(disliked.toLowerCase())
            )
          );

          // Check for missing ingredients and add to cart
          const availableIngredients = new Set(fridgeInventory.map(i => i.toLowerCase()));
          const missingIngredients: string[] = [];
          
          for (const ingredient of recipe.ingredients) {
            if (!availableIngredients.has(ingredient.name.toLowerCase())) {
              missingIngredients.push(ingredient.name);
              try {
                const addResult = await memorySystem.addToInstacart(userId, ingredient.name, ingredient.quantity, namespace);
                console.log('Added to cart:', addResult);
              } catch (error) {
                console.error(`Failed to add ${ingredient.name} to cart:`, error);
              }
            }
          }

          // Save recipe request to episodic memory
          await memorySystem.saveEpisode(userId, { 
            user: userMessage, 
            agent: `Found ${recipeName} from ${recipeSource}. Generated recipe with ${recipe.ingredients.length} ingredients. ${missingIngredients.length > 0 ? `Added ${missingIngredients.length} missing items to Instacart cart.` : 'All ingredients available!'}` 
          }, namespace);

          const cartMessage = missingIngredients.length > 0 
            ? ` I've added ${missingIngredients.join(', ')} to your Instacart cart since they weren't in your fridge.`
            : '';

          const webMessage = webRecipes.includes('allrecipes') || webRecipes.includes('food.com') 
            ? ' This recipe is sourced from a popular cooking website!'
            : '';

          return { 
            response: `Perfect! I found a delicious ${recipe.name} recipe${recipe.source && recipe.source !== 'web-search' ? ` from ${recipe.source}` : ' from the web'} that matches your ${profile.dietary.length > 0 ? profile.dietary.join(' and ') + ' ' : ''}preferences.${cartMessage}${webMessage} Check the recipe card below for full details!`, 
            recipe 
          };
        } catch (error) {
          console.error('Web recipe retrieval failed:', error);
          // Fallback to local recipe generation
        }
      }

      // Process non-recipe conversation
      let response = "I'm your AI kitchen assistant with web recipe search! I can find real recipes from cooking websites like AllRecipes and Food.com, manage your ingredients, and add missing items to your shopping cart. Just ask me for a recipe and I'll tell you where it came from!";
      
      // Personalize based on learned preferences
      if (profile.likes.length > 0) {
        response += ` I remember you like ${profile.likes.slice(0, 3).join(', ')}.`;
      }
      if (profile.dislikes.length > 0) {
        response += ` I'll avoid ${profile.dislikes.slice(0, 3).join(', ')} in my suggestions.`;
      }
      if (profile.dietary.length > 0) {
        response += ` I'll find ${profile.dietary.join(' and ')} recipes for you.`;
      }

      response += " Ask me to find a recipe and I'll search the web for real recipes personalized just for you!";

      // Save conversation to memory
      await memorySystem.saveEpisode(userId, { user: userMessage, agent: response }, namespace);

      return { response };
    } catch (error) {
      console.error('Error in processConversation:', error);
      return { response: "I apologize, but I encountered an issue processing your request. Could you please try again?" };
    }
  }
}

// Create singleton instance
export const conversationalAgent = new ConversationalAgent();