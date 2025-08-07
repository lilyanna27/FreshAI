import { ChromaClient } from 'chromadb';
import { OpenAIEmbeddings } from '@langchain/openai';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import axios from 'axios';

// Hypothetical LangChain-like framework for TypeScript
interface Tool {
  name: string;
  description: string;
  func: (input: any) => Promise<any>;
}

interface AgentExecutor {
  invoke(input: any): Promise<any>;
}

interface ReactAgent {
  constructor(config: { model: string; tools: Tool[]; systemPrompt: string; preSteps: Array<(input: any) => Promise<any>> });
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
    } catch {
      // Initialize with sample recipes for fallback
      const sampleRecipes = [
        {
          id: uuidv4(),
          content: `Vegan Pasta Primavera: A light, vegetable-packed pasta dish. Ingredients: 200g pasta, 1 zucchini, 1 bell pepper, 1 cup cherry tomatoes, 2 tbsp olive oil, 2 cloves garlic, 1 tsp Italian herbs. Instructions: 1. Boil pasta until al dente. 2. Sauté garlic, zucchini, bell pepper in olive oil. 3. Add tomatoes and herbs, toss with pasta.`,
          metadata: { title: 'Vegan Pasta Primavera', cuisine: 'Italian', dietary: ['vegan'], source: 'mock-recipe-site.com' },
        },
        {
          id: uuidv4(),
          content: `Chicken Curry: A spicy Indian dish. Ingredients: 500g chicken, 1 onion, 2 tbsp curry powder, 400ml coconut milk, 1 cup rice. Instructions: 1. Cook rice. 2. Sauté onion, add curry powder and chicken. 3. Add coconut milk, simmer until cooked.`,
          metadata: { title: 'Chicken Curry', cuisine: 'Indian', dietary: [], source: 'mock-recipe-site.com' },
        },
      ];
      for (const recipe of sampleRecipes) {
        recipe.embedding = await this.embeddings.embedQuery(recipe.content);
      }
      await fs.writeFile(this.recipeFile, JSON.stringify(sampleRecipes, null, 2));
      this.recipes = sampleRecipes;
    }
    // Load existing recipes
    const data = await fs.readFile(this.recipeFile, 'utf-8');
    this.recipes = JSON.parse(data);
  }

  async similaritySearch(query: string, k: number = 2): Promise<RecipeDocument[]> {
    const queryEmbedding = await this.embeddings.embedQuery(query);
    // Mock cosine similarity
    const similarities = this.recipes.map(recipe => ({
      recipe,
      similarity: this.cosineSimilarity(queryEmbedding, recipe.embedding),
    }));
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, k)
      .map(item => item.recipe);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  async asRetriever() {
    return {
      invoke: async (query: string) => await this.similaritySearch(query),
    };
  }
}

class MemorySystem {
  private chroma: ChromaClient;
  private embeddings: OpenAIEmbeddings;
  private semanticCollection: string = 'semantic_memories';
  private episodicCollection: string = 'episodic_memories';
  private defaultNamespace: string = 'agent_memories';
  private cartFile: string = path.join(process.cwd(), 'instacart_cart.json');
  private recipeStore: RecipeVectorStore;
  private tavilyApiKey: string | undefined = process.env.TAVILY_API_KEY;

  constructor() {
    const dbPath = path.join(process.cwd(), 'chroma_db');
    this.chroma = new ChromaClient({ path: dbPath });
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
    this.recipeStore = new RecipeVectorStore(this.embeddings);
    this.initializeCollections();
    this.initializeCart();
  }

  private async initializeCollections(): Promise<void> {
    try {
      await this.chroma.createCollection({ name: this.semanticCollection });
      await this.chroma.createCollection({ name: this.episodicCollection });
    } catch (error) {
      if ((error as any).message.includes('already exists')) {
        // Collections already exist
      } else {
        console.error('Failed to initialize collections:', error);
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
      const embedding = await this.embeddings.embedQuery(content);
      const collection = type === 'semantic' ? this.semanticCollection : this.episodicCollection;

      await this.chroma.add({
        collectionName: collection,
        ids: [id],
        embeddings: [embedding],
        documents: [content],
        metadatas: [{ user_id: userId, namespace, timestamp: new Date().toISOString(), type }],
      });

      return { status: 'success', message: `Saved ${type} memory: ${content}` };
    } catch (error) {
      return { status: 'error', message: `Failed to save ${type} memory: ${error}` };
    }
  }

  // Save an episodic memory (conversation)
  async saveEpisode(userId: string, conversation: { user: string; agent: string }, namespace: string): Promise<MemoryResult> {
    const content = `User: ${conversation.user}\nAgent: ${conversation.agent}`;
    const result = await this.saveMemory(userId, content, namespace, 'episodic');
    
    // Reflect on the conversation to generate a takeaway
    const takeaway = await this.reflect(userId, conversation, namespace);
    if (takeaway.status === 'success' && takeaway.message) {
      await this.saveMemory(userId, takeaway.message, namespace, 'takeaway');
    }
    
    return result;
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

  // Update an existing memory
  async updateMemory(userId: string, memoryId: string, content: string, namespace: string, type: 'semantic' | 'episodic' | 'takeaway'): Promise<MemoryResult> {
    try {
      const embedding = await this.embeddings.embedQuery(content);
      const collection = type === 'semantic' ? this.semanticCollection : this.episodicCollection;
      
      await this.chroma.update({
        collectionName: collection,
        ids: [memoryId],
        embeddings: [embedding],
        documents: [content],
        metadatas: [{ user_id: userId, namespace, timestamp: new Date().toISOString(), type }],
      });
      return { status: 'success', message: `Updated ${type} memory ID ${memoryId}` };
    } catch (error) {
      return { status: 'error', message: `Failed to update ${type} memory: ${error}` };
    }
  }

  // Delete a memory
  async deleteMemory(memoryId: string, type: 'semantic' | 'episodic' | 'takeaway'): Promise<MemoryResult> {
    try {
      const collection = type === 'semantic' ? this.semanticCollection : this.episodicCollection;
      await this.chroma.delete({
        collectionName: collection,
        ids: [memoryId],
      });
      return { status: 'success', message: `Deleted ${type} memory ID ${memoryId}` };
    } catch (error) {
      return { status: 'error', message: `Failed to delete ${type} memory: ${error}` };
    }
  }

  // Search memories (semantic or episodic)
  async searchMemories(userId: string, query: string, namespace: string, type: 'semantic' | 'episodic' | 'takeaway', limit: number = 5): Promise<MemoryResult> {
    try {
      const embedding = await this.embeddings.embedQuery(query);
      const collection = type === 'semantic' ? this.semanticCollection : this.episodicCollection;
      
      const results = await this.chroma.query({
        collectionName: collection,
        queryEmbeddings: [embedding],
        nResults: limit,
        where: { user_id: userId, namespace, type },
      });

      const memories: MemoryEntry[] = results.documents[0].map((content, i) => ({
        id: results.ids[0][i],
        user_id: userId,
        namespace,
        content,
        timestamp: results.metadatas[0][i].timestamp,
        type,
      }));

      return { status: 'success', memories };
    } catch (error) {
      return { status: 'error', message: `Failed to search ${type} memories: ${error}` };
    }
  }

  // Get organized user profile
  async getUserProfile(userId: string, namespace: string = `${this.defaultNamespace}/{user_id}`): Promise<UserProfile> {
    const namespaceResolved = namespace.replace('{user_id}', userId);
    const dislikes = (await this.searchMemories(userId, 'dislike', namespaceResolved, 'semantic')).memories
      ?.filter(m => m.content.startsWith('User dislikes'))
      .map(m => m.content.replace('User dislikes ', '')) || [];
    const likes = (await this.searchMemories(userId, 'like', namespaceResolved, 'semantic')).memories
      ?.filter(m => m.content.startsWith('User likes'))
      .map(m => m.content.replace('User likes ', '')) || [];
    const cuisines = (await this.searchMemories(userId, 'cuisine', namespaceResolved, 'semantic')).memories
      ?.filter(m => m.content.startsWith('User prefers'))
      .map(m => m.content.replace('User prefers ', '').replace(' cuisine', '')) || [];
    const dietary = (await this.searchMemories(userId, 'dietary', namespaceResolved, 'semantic')).memories
      ?.filter(m => m.content.startsWith('User has'))
      .map(m => m.content.replace('User has ', '').replace(' dietary restriction', '')) || [];

    return { dislikes, likes, cuisines, dietary };
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
      if (profile.dislikes.includes(lowerIngredient)) {
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
          .map(doc => `Source: ${doc.metadata.source}\nContent: ${doc.content}`)
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
          if (profile.dislikes.some(dislike => content.toLowerCase().includes(dislike))) {
            return null;
          }
          if (profile.dietary.length > 0 && !profile.dietary.some(diet => content.toLowerCase().includes(diet))) {
            return null;
          }
          return `Source: ${result.url}\nContent: ${content}`;
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
        .map(doc => `Source: ${doc.metadata.source}\nContent: ${doc.content}`)
        .join('\n\n');
    } catch (error) {
      console.error('Tavily API error:', error);
      // Fallback to local recipe store
      const localRecipes = await this.recipeStore.similaritySearch(query, 2);
      return localRecipes
        .map(doc => `Source: ${doc.metadata.source}\nContent: ${doc.content}`)
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
  "d