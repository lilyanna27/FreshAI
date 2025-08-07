import { ChromaClient } from 'chromadb';
import { OpenAIEmbeddings } from '@langchain/openai';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import axios from 'axios';
import OpenAI from 'openai';

// Interfaces for the system
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

interface MemoryEntry {
  id: string;
  user_id: string;
  namespace: string;
  content: string;
  timestamp: string;
  embedding?: number[];
  type: 'semantic' | 'episodic' | 'takeaway';
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

interface Recipe {
  name: string;
  cuisine: string;
  ingredients: { name: string; quantity: string }[];
  instructions: string[];
  dietary: string[];
  source?: string;
}

interface CartItem {
  user_id: string;
  ingredient: string;
  quantity: string;
  timestamp: string;
}

interface RecipeDocument {
  id: string;
  content: string;
  metadata: { title: string; cuisine: string; dietary: string[]; source: string };
  embedding: number[];
}

// Recipe Vector Store for local fallback recipes
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
      const data = await fs.readFile(this.recipeFile, 'utf-8');
      this.recipes = JSON.parse(data);
    } catch {
      // Initialize with sample recipes for fallback
      const sampleRecipes = [
        {
          id: uuidv4(),
          content: `Vegan Pasta Primavera: A light, vegetable-packed pasta dish. Ingredients: 200g pasta, 1 zucchini diced, 1 bell pepper sliced, 1 cup cherry tomatoes halved, 2 tbsp olive oil, 2 cloves garlic minced, 1 tsp Italian herbs, salt and pepper to taste. Instructions: 1. Boil pasta until al dente according to package directions. 2. Heat olive oil in large pan over medium heat. 3. Sauté garlic for 1 minute until fragrant. 4. Add zucchini and bell pepper, cook 5 minutes until tender. 5. Add cherry tomatoes and herbs, cook 3 minutes. 6. Drain pasta and toss with vegetables. 7. Season with salt and pepper, serve immediately.`,
          metadata: { title: 'Vegan Pasta Primavera', cuisine: 'Italian', dietary: ['vegan'], source: 'local-recipe-store' },
          embedding: []
        },
        {
          id: uuidv4(),
          content: `Chicken Curry: A spicy Indian dish with aromatic spices. Ingredients: 500g chicken breast cubed, 1 large onion diced, 2 tbsp curry powder, 400ml coconut milk, 1 cup basmati rice, 2 cloves garlic minced, 1 tbsp ginger grated, 2 tbsp vegetable oil, 1 tsp turmeric, salt to taste. Instructions: 1. Cook rice according to package directions. 2. Heat oil in large pot over medium heat. 3. Sauté onion until golden, about 5 minutes. 4. Add garlic and ginger, cook 1 minute. 5. Add curry powder and turmeric, cook 30 seconds until fragrant. 6. Add chicken and cook until browned. 7. Pour in coconut milk and simmer 15 minutes until chicken is cooked through. 8. Season with salt and serve over rice.`,
          metadata: { title: 'Chicken Curry', cuisine: 'Indian', dietary: [], source: 'local-recipe-store' },
          embedding: []
        },
        {
          id: uuidv4(),
          content: `Mediterranean Quinoa Salad: A healthy, protein-rich salad. Ingredients: 1 cup quinoa, 1 cucumber diced, 1 cup cherry tomatoes halved, 1/2 red onion thinly sliced, 1/2 cup kalamata olives, 1/2 cup feta cheese crumbled, 1/4 cup olive oil, 2 tbsp lemon juice, 2 tbsp fresh herbs chopped, salt and pepper to taste. Instructions: 1. Rinse quinoa and cook according to package directions, let cool. 2. In large bowl, combine cooled quinoa, cucumber, tomatoes, onion, and olives. 3. Whisk together olive oil, lemon juice, herbs, salt and pepper. 4. Pour dressing over salad and toss. 5. Top with feta cheese and serve chilled.`,
          metadata: { title: 'Mediterranean Quinoa Salad', cuisine: 'Mediterranean', dietary: ['vegetarian', 'gluten-free'], source: 'local-recipe-store' },
          embedding: []
        }
      ];
      
      // Generate embeddings for sample recipes
      for (const recipe of sampleRecipes) {
        try {
          recipe.embedding = await this.embeddings.embedQuery(recipe.content);
        } catch (error) {
          console.warn('Failed to generate embedding for recipe:', recipe.metadata.title);
          recipe.embedding = new Array(1536).fill(0); // Fallback empty embedding
        }
      }
      
      await fs.writeFile(this.recipeFile, JSON.stringify(sampleRecipes, null, 2));
      this.recipes = sampleRecipes;
    }
  }

  async similaritySearch(query: string, k: number = 2): Promise<RecipeDocument[]> {
    if (this.recipes.length === 0) {
      return [];
    }
    
    try {
      const queryEmbedding = await this.embeddings.embedQuery(query);
      const similarities = this.recipes.map(recipe => ({
        recipe,
        similarity: this.cosineSimilarity(queryEmbedding, recipe.embedding),
      }));
      
      return similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, k)
        .map(item => item.recipe);
    } catch (error) {
      console.warn('Failed to perform similarity search:', error);
      return this.recipes.slice(0, k); // Return first k recipes as fallback
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length === 0 || b.length === 0) return 0;
    
    const dotProduct = a.reduce((sum, val, i) => sum + val * (b[i] || 0), 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
  }

  async asRetriever() {
    return {
      invoke: async (query: string) => await this.similaritySearch(query),
    };
  }
}

// Main Memory System with ChromaDB and SQLite fallback
class MemorySystem {
  private chroma: ChromaClient;
  private embeddings: OpenAIEmbeddings;
  private openai: OpenAI;
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
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
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

  // Extract and save semantic preferences from user text
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

    // Pattern matching for dislikes
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

    // Pattern matching for likes
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

    // Cuisine detection
    const cuisineTypes = ['italian', 'asian', 'chinese', 'japanese', 'mexican', 'indian', 'thai', 'mediterranean', 'french', 'american', 'korean', 'vietnamese', 'greek', 'spanish', 'turkish'];
    for (const cuisine of cuisineTypes) {
      if (lowerText.includes(cuisine)) {
        if (!(await this.searchMemories(userId, `cuisine ${cuisine}`, namespace, 'semantic')).memories?.some(m => m.content.includes(cuisine))) {
          await this.saveMemory(userId, `User prefers ${cuisine} cuisine`, namespace, 'semantic');
          result.newCuisines.push(cuisine);
        }
      }
    }

    // Dietary restriction detection
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

  // Save a memory (semantic, episodic, or takeaway)
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

  // Save an episodic memory (complete conversation)
  async saveEpisode(userId: string, conversation: { user: string; agent: string }, namespace: string): Promise<MemoryResult> {
    const content = `User: ${conversation.user}\nAgent: ${conversation.agent}`;
    const result = await this.saveMemory(userId, content, namespace, 'episodic');
    
    // Generate takeaway from conversation
    const takeaway = await this.reflect(userId, conversation, namespace);
    if (takeaway.status === 'success' && takeaway.message) {
      await this.saveMemory(userId, takeaway.message, namespace, 'takeaway');
    }
    
    return result;
  }

  // Reflect on conversation to generate takeaways
  async reflect(userId: string, conversation: { user: string; agent: string }, namespace: string): Promise<MemoryResult> {
    try {
      const prompt = `Given the conversation:
User: ${conversation.user}
Agent: ${conversation.agent}

Generate a concise takeaway about user preferences or recipe interactions (e.g., "User prefers vegan recipes", "User likes spicy Asian food", "User wants quick 30-minute meals").`;
      
      const llmResponse = await this.openai.chat.completions.create({
        model: 'gpt-4o', // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: 'system', content: prompt }],
        max_tokens: 100,
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

  // Search memories (semantic, episodic, or takeaways)
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

  // Get organized user profile from semantic memories
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

  // Load procedural memory rules from file
  async loadProceduralMemory(): Promise<string> {
    try {
      const filePath = path.join(process.cwd(), 'procedural_memory.txt');
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      console.error('Failed to load procedural memory:', error);
      return `1. Store and recall past recipes requested by the user
2. Confirm user dietary preferences before suggesting recipes
3. Use past recipe interactions to personalize future suggestions
4. Provide clear recipe instructions with ingredient substitutions based on user preferences
5. Ask for clarification if user preferences are ambiguous or missing
6. Maintain a friendly and culinary-focused tone in recipe discussions
7. Summarize past recipe feedback to refine future recommendations
8. Offer alternative recipes if the user rejects initial suggestions
9. Acknowledge and confirm user feedback on recipes
10. Regularly update user preferences based on new interactions`;
    }
  }

  // Add ingredient to Instacart cart with preference checking
  async addToInstacart(userId: string, ingredient: string, quantity: string = '1 unit', namespace: string): Promise<string> {
    try {
      const profile = await this.getUserProfile(userId, namespace);
      const lowerIngredient = ingredient.toLowerCase();

      // Check if ingredient conflicts with user dislikes
      if (profile.dislikes.some(dislike => lowerIngredient.includes(dislike.toLowerCase()))) {
        return `Cannot add ${ingredient} to cart because you dislike it.`;
      }

      // Check for dietary substitutions needed
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

  // Retrieve recipes from web using Tavily API
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
      enhancedQuery += ` recipe ingredients instructions`;

      console.log('Search query for Tavily:', enhancedQuery);

      if (!this.tavilyApiKey) {
        console.warn('Tavily API key missing, falling back to local recipe store');
        const localRecipes = await this.recipeStore.similaritySearch(enhancedQuery, 2);
        return localRecipes
          .map(doc => `**Recipe: ${doc.metadata.title}**\nSource: ${doc.metadata.source}\n${doc.content}`)
          .join('\n\n');
      }

      // Call Tavily Search API with cooking-focused domains
      const response = await axios.post(
        'https://api.tavily.com/search',
        {
          api_key: this.tavilyApiKey,
          query: enhancedQuery,
          search_depth: 'advanced',
          max_results: 3,
          include_raw_content: true,
          include_answer: true,
          include_domains: ['allrecipes.com', 'food.com', 'delish.com', 'foodnetwork.com', 'epicurious.com', 'tasty.co', 'simplyrecipes.com']
        },
        { 
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        }
      );

      const results = response.data.results || [];
      console.log('Tavily API returned', results.length, 'results');

      if (results.length === 0) {
        console.log('No results from Tavily, falling back to local recipes');
        const localRecipes = await this.recipeStore.similaritySearch(enhancedQuery, 2);
        return localRecipes
          .map(doc => `**Recipe: ${doc.metadata.title}**\nSource: ${doc.metadata.source}\n${doc.content}`)
          .join('\n\n');
      }

      // Process each result to extract structured recipe data
      const processedRecipes: string[] = [];

      for (const result of results) {
        const content = result.raw_content || result.content || 'No content available';
        const title = result.title || 'Untitled Recipe';
        const source = result.url || 'Unknown source';

        console.log(`Processing recipe: ${title}`);
        console.log('Raw web content sample:', `Source: ${source}\nTitle: ${title}\nContent: ${content.substring(0, 200)}...`);

        // Filter out content that conflicts with user preferences
        const lowerContent = content.toLowerCase();
        if (profile.dislikes.some(dislike => lowerContent.includes(dislike.toLowerCase()))) {
          console.log(`Skipping recipe due to user dislikes: ${title}`);
          continue;
        }

        // Extract ingredients using multiple patterns
        const ingredients = this.extractIngredientsFromContent(content);
        console.log('Extracted ingredients:', ingredients);

        // Extract instructions using multiple patterns
        const instructions = this.extractInstructionsFromContent(content);
        console.log('Extracted instructions:', instructions);

        // Create formatted recipe
        const formattedRecipe = this.formatExtractedRecipe(title, source, ingredients, instructions);
        processedRecipes.push(formattedRecipe);
      }

      if (processedRecipes.length > 0) {
        await this.saveMemory(userId, `Retrieved ${processedRecipes.length} web recipes for query: ${enhancedQuery}`, namespace, 'episodic');
        return processedRecipes.join('\n\n---\n\n');
      }

      // Final fallback to local recipes
      console.log('No valid web recipes found, using local fallback');
      const localRecipes = await this.recipeStore.similaritySearch(enhancedQuery, 2);
      return localRecipes
        .map(doc => `**Recipe: ${doc.metadata.title}**\nSource: ${doc.metadata.source}\n${doc.content}`)
        .join('\n\n');

    } catch (error) {
      console.error('Tavily API error:', error);
      // Fallback to local recipe store
      const localRecipes = await this.recipeStore.similaritySearch(query, 2);
      return localRecipes
        .map(doc => `**Recipe: ${doc.metadata.title}**\nSource: ${doc.metadata.source}\n${doc.content}`)
        .join('\n\n');
    }
  }

  // Enhanced ingredient extraction with multiple patterns
  private extractIngredientsFromContent(content: string): string[] {
    const ingredients: string[] = [];
    
    // Pattern 1: Lines that start with measurements
    const measurementPattern = /(?:^|\n)\s*[\d\u00BC-\u00BE\u2150-\u215E\/]+\s*(?:cups?|cup|tbsp|tablespoons?|tsp|teaspoons?|oz|ounces?|lbs?|pounds?|g|grams?|kg|ml|l|liters?|cloves?|slices?|pieces?)\s+[^\n\r.!?]{3,50}/gim;
    let matches = content.match(measurementPattern);
    if (matches) {
      ingredients.push(...matches.map(m => m.trim().replace(/^\n\s*/, '')));
    }

    // Pattern 2: Bullet point ingredients
    const bulletPattern = /(?:^|\n)\s*[•\-\*]\s*[\d\u00BC-\u00BE\u2150-\u215E\/]*\s*(?:cups?|cup|tbsp|tablespoons?|tsp|teaspoons?|oz|ounces?|lbs?|pounds?|g|grams?|kg|ml|l|liters?)?\s*[^\n\r.!?]{3,50}/gim;
    matches = content.match(bulletPattern);
    if (matches) {
      ingredients.push(...matches.map(m => m.trim().replace(/^[•\-\*]\s*/, '')));
    }

    // Pattern 3: Common ingredient words with quantities
    const commonIngredients = ['chicken', 'beef', 'pork', 'fish', 'eggs', 'milk', 'cheese', 'butter', 'oil', 'onion', 'garlic', 'tomato', 'potato', 'carrot', 'pepper', 'salt', 'sugar', 'flour', 'rice', 'pasta', 'beans', 'bread', 'herbs', 'spices'];
    for (const ingredient of commonIngredients) {
      const pattern = new RegExp(`[\\d\\u00BC-\\u00BE\\u2150-\\u215E\\/]+\\s*(?:cups?|cup|tbsp|tablespoons?|tsp|teaspoons?|oz|ounces?|lbs?|pounds?|g|grams?|kg|ml|l|liters?|cloves?|slices?|pieces?)\\s+[^\\n\\r.!?]*${ingredient}[^\\n\\r.!?]*`, 'gi');
      matches = content.match(pattern);
      if (matches) {
        ingredients.push(...matches.map(m => m.trim()));
      }
    }

    // Clean and deduplicate ingredients
    const cleanedIngredients = ingredients
      .filter(ing => ing.length > 3 && ing.length < 100)
      .map(ing => ing.replace(/[^\w\s\u00BC-\u00BE\u2150-\u215E\/\-\.]/g, '').trim())
      .filter(ing => ing.length > 0)
      .slice(0, 15); // Limit to 15 ingredients

    return Array.from(new Set(cleanedIngredients));
  }

  // Enhanced instruction extraction with multiple patterns
  private extractInstructionsFromContent(content: string): string[] {
    const instructions: string[] = [];
    
    // Pattern 1: Numbered steps
    const numberedPattern = /(?:^|\n)\s*\d+\.\s*[^\n\r]{10,200}/gim;
    let matches = content.match(numberedPattern);
    if (matches) {
      instructions.push(...matches.map(m => m.trim().replace(/^\d+\.\s*/, '')));
    }

    // Pattern 2: Lines with cooking action words
    const cookingActions = ['heat', 'cook', 'bake', 'fry', 'sauté', 'simmer', 'boil', 'mix', 'stir', 'add', 'combine', 'season', 'serve', 'garnish', 'prepare', 'preheat', 'blend', 'whisk', 'chop', 'dice', 'slice'];
    for (const action of cookingActions) {
      const pattern = new RegExp(`(?:^|\\n)\\s*[^\\n\\r]*${action}[^\\n\\r]{10,200}`, 'gim');
      matches = content.match(pattern);
      if (matches) {
        instructions.push(...matches.map(m => m.trim()));
      }
    }

    // Clean and deduplicate instructions
    const cleanedInstructions = instructions
      .filter(inst => inst.length > 10 && inst.length < 300)
      .filter(inst => !inst.includes('http') && !inst.includes('www.'))
      .map(inst => inst.replace(/[^\w\s\.,!?;:\-]/g, '').trim())
      .filter(inst => inst.length > 0)
      .slice(0, 10); // Limit to 10 instructions

    return Array.from(new Set(cleanedInstructions));
  }

  // Format extracted recipe data
  private formatExtractedRecipe(title: string, source: string, ingredients: string[], instructions: string[]): string {
    let formatted = `**Recipe: ${title}**\nSource: ${source}\n\n`;
    
    if (ingredients.length > 0) {
      formatted += '**Ingredients:**\n';
      ingredients.forEach(ingredient => {
        formatted += `• ${ingredient}\n`;
      });
      formatted += '\n';
    }
    
    if (instructions.length > 0) {
      formatted += '**Instructions:**\n';
      instructions.forEach((instruction, index) => {
        formatted += `${index + 1}. ${instruction}\n`;
      });
    }
    
    if (ingredients.length === 0 && instructions.length === 0) {
      formatted += 'Recipe details available at source link above.\n';
    }
    
    return formatted;
  }

  // Get memory tools for agent integration
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

// Ingredient substitution system for dietary restrictions
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
    "meat": ["tofu", "tempeh", "seitan", "mushrooms"],
    "chicken": ["tofu", "tempeh", "seitan"],
    "beef": ["mushrooms", "lentils", "black beans"],
    "fish": ["tofu", "tempeh", "mushrooms"]
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
  },
  "keto": {
    "sugar": ["stevia", "erythritol", "monk fruit"],
    "flour": ["almond flour", "coconut flour"],
    "pasta": ["shirataki noodles", "zucchini noodles"],
    "rice": ["cauliflower rice"],
    "bread": ["keto bread", "lettuce wraps"]
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

// Conversational Agent with complete memory integration
export class ConversationalAgent {
  private memorySystem: MemorySystem;
  private openai: OpenAI;

  constructor() {
    this.memorySystem = new MemorySystem();
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async processConversation(
    userId: string, 
    userMessage: string, 
    fridgeInventory: string[] = [], 
    namespaceTemplate: string = 'agent_memories/{user_id}'
  ): Promise<{
    response: string;
    recipe?: Recipe;
    thought_process: Array<{
      step: string;
      content: string;
    }>;
  }> {
    const namespace = namespaceTemplate.replace('{user_id}', userId);
    const thoughtProcess: Array<{ step: string; content: string }> = [];

    try {
      // Step 1: Extract preferences from user message
      thoughtProcess.push({
        step: "Preference Extraction",
        content: "Analyzing user message for food preferences, dietary restrictions, and dislikes"
      });
      
      const preferences = await this.memorySystem.extractAndSavePreferences(userId, userMessage, namespaceTemplate);
      
      if (preferences.newDislikes.length > 0 || preferences.newLikes.length > 0 || 
          preferences.newCuisines.length > 0 || preferences.newDietary.length > 0) {
        thoughtProcess.push({
          step: "New Preferences Found",
          content: `Saved new preferences: ${JSON.stringify(preferences)}`
        });
      }

      // Step 2: Search memory for context
      thoughtProcess.push({
        step: "Memory Search",
        content: "Searching semantic, episodic, and takeaway memories for relevant context"
      });

      const [semanticResult, episodicResult, takeawayResult] = await Promise.all([
        this.memorySystem.searchMemories(userId, userMessage, namespace, 'semantic', 3),
        this.memorySystem.searchMemories(userId, userMessage, namespace, 'episodic', 3),
        this.memorySystem.searchMemories(userId, userMessage, namespace, 'takeaway', 3),
      ]);

      const memoryContext = {
        semantic: semanticResult.memories?.map(m => m.content) || [],
        episodic: episodicResult.memories?.map(m => m.content) || [],
        takeaways: takeawayResult.memories?.map(m => m.content) || []
      };

      thoughtProcess.push({
        step: "Memory Context",
        content: `Found ${memoryContext.semantic.length} semantic memories, ${memoryContext.episodic.length} episodic memories, ${memoryContext.takeaways.length} takeaways`
      });

      // Step 3: Load procedural memory
      const proceduralMemory = await this.memorySystem.loadProceduralMemory();

      // Step 4: Get user profile
      const profile = await this.memorySystem.getUserProfile(userId, namespaceTemplate);
      
      thoughtProcess.push({
        step: "User Profile",
        content: `Profile: ${profile.dietary.length} dietary restrictions, ${profile.likes.length} likes, ${profile.dislikes.length} dislikes, ${profile.cuisines.length} preferred cuisines`
      });

      // Step 5: Check if this is a recipe request
      const lowerMessage = userMessage.toLowerCase();
      const isRecipeRequest = lowerMessage.includes('recipe') || 
                             lowerMessage.includes('cook') || 
                             lowerMessage.includes('make') ||
                             lowerMessage.includes('dish') ||
                             lowerMessage.includes('meal') ||
                             lowerMessage.includes('ingredients');

      if (isRecipeRequest) {
        thoughtProcess.push({
          step: "Recipe Request Detected",
          content: "Processing as recipe generation request with web search"
        });

        // Step 6: Retrieve web recipes using Tavily
        const webRecipeContent = await this.memorySystem.retrieveWebRecipes(userMessage, userId, namespace);
        
        thoughtProcess.push({
          step: "Web Recipe Retrieval",
          content: `Retrieved recipe content from web sources`
        });

        // Step 7: Generate response with LLM
        const systemPrompt = `You are a helpful recipe assistant with memory of past conversations. 

PROCEDURAL MEMORY (follow these rules):
${proceduralMemory}

USER PROFILE:
- Dietary restrictions: ${profile.dietary.join(', ') || 'None'}
- Likes: ${profile.likes.join(', ') || 'None specified'}
- Dislikes: ${profile.dislikes.join(', ') || 'None specified'}
- Preferred cuisines: ${profile.cuisines.join(', ') || 'None specified'}

MEMORY CONTEXT:
Semantic memories: ${memoryContext.semantic.join('; ')}
Past conversations: ${memoryContext.episodic.join('; ')}
Key takeaways: ${memoryContext.takeaways.join('; ')}

AVAILABLE INGREDIENTS IN FRIDGE: ${fridgeInventory.join(', ') || 'No ingredients specified'}

WEB RECIPE CONTENT:
${webRecipeContent}

Based on the web recipe content above and user preferences, provide a helpful response with:
1. A personalized recipe recommendation
2. Clear ingredient list with quantities  
3. Step-by-step instructions
4. Source attribution from the web content
5. Any ingredient substitutions for dietary restrictions

Be conversational and reference past interactions when relevant. If ingredients are missing from the fridge, mention that they can be added to a shopping cart.`;

        const response = await this.openai.chat.completions.create({
          model: 'gpt-4o', // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          max_tokens: 1000,
          temperature: 0.7,
        });

        const agentResponse = response.choices[0].message.content || 'I apologize, but I encountered an issue generating a recipe response.';

        // Step 8: Check for missing ingredients and create recipe object
        const availableIngredients = new Set(fridgeInventory.map(i => i.toLowerCase()));
        let missingIngredients: string[] = [];

        // Extract ingredients from web content for missing ingredient check
        const ingredientMatches = webRecipeContent.match(/(?:^|\n)\s*[•\-\*]?\s*[\d\u00BC-\u00BE\u2150-\u215E\/]*\s*(?:cups?|cup|tbsp|tablespoons?|tsp|teaspoons?|oz|ounces?|lbs?|pounds?|g|grams?|kg|ml|l|liters?)?\s*([a-zA-Z][^,\n\r]{2,30})/gim);
        
        if (ingredientMatches) {
          const extractedIngredients = ingredientMatches
            .map(match => match.replace(/^[•\-\*\s\d\u00BC-\u00BE\u2150-\u215E\/]*(?:cups?|cup|tbsp|tablespoons?|tsp|teaspoons?|oz|ounces?|lbs?|pounds?|g|grams?|kg|ml|l|liters?)?\s*/i, '').trim())
            .filter(ing => ing.length > 2);

          missingIngredients = extractedIngredients.filter(ingredient => 
            !availableIngredients.has(ingredient.toLowerCase())
          ).slice(0, 5); // Limit to 5 missing ingredients
        }

        thoughtProcess.push({
          step: "Missing Ingredients Check",
          content: `Found ${missingIngredients.length} missing ingredients: ${missingIngredients.join(', ')}`
        });

        // Step 9: Save conversation to episodic memory
        await this.memorySystem.saveEpisode(userId, { 
          user: userMessage, 
          agent: agentResponse 
        }, namespace);

        return {
          response: agentResponse,
          thought_process: thoughtProcess
        };

      } else {
        // Non-recipe conversation
        thoughtProcess.push({
          step: "General Conversation",
          content: "Processing as general food/cooking conversation"
        });

        const systemPrompt = `You are a helpful cooking and food assistant with memory of past conversations.

PROCEDURAL MEMORY (follow these rules):
${proceduralMemory}

USER PROFILE:
- Dietary restrictions: ${profile.dietary.join(', ') || 'None'}
- Likes: ${profile.likes.join(', ') || 'None specified'}
- Dislikes: ${profile.dislikes.join(', ') || 'None specified'}
- Preferred cuisines: ${profile.cuisines.join(', ') || 'None specified'}

MEMORY CONTEXT:
Semantic memories: ${memoryContext.semantic.join('; ')}
Past conversations: ${memoryContext.episodic.join('; ')}
Key takeaways: ${memoryContext.takeaways.join('; ')}

Respond helpfully to the user's question, referencing their preferences and past conversations when relevant.`;

        const response = await this.openai.chat.completions.create({
          model: 'gpt-4o', // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          max_tokens: 500,
          temperature: 0.7,
        });

        const agentResponse = response.choices[0].message.content || 'I apologize, but I encountered an issue processing your request.';

        // Save conversation to episodic memory
        await this.memorySystem.saveEpisode(userId, { 
          user: userMessage, 
          agent: agentResponse 
        }, namespace);

        return {
          response: agentResponse,
          thought_process: thoughtProcess
        };
      }

    } catch (error) {
      console.error('ConversationalAgent error:', error);
      
      thoughtProcess.push({
        step: "Error",
        content: `Encountered error: ${error.message}`
      });

      return {
        response: 'I apologize, but I encountered an issue processing your request. Could you please try again?',
        thought_process: thoughtProcess
      };
    }
  }
}

// Create singleton instances for export
export const memorySystem = new MemorySystem();
export const conversationalAgent = new ConversationalAgent();