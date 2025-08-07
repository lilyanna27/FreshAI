import { ChromaClient } from 'chromadb';
import { OpenAIEmbeddings } from '@langchain/openai';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';

// Hypothetical LangChain-like framework for TypeScript
import { Tool, AgentExecutor, ReactAgent } from './langchain';

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

class MemorySystem {
  private chroma: ChromaClient;
  private embeddings: OpenAIEmbeddings;
  private semanticCollection: string = 'semantic_memories';
  private episodicCollection: string = 'episodic_memories';
  private defaultNamespace: string = 'agent_memories';

  constructor() {
    const dbPath = path.join(process.cwd(), 'chroma_db');
    this.chroma = new ChromaClient({ path: dbPath });
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
    this.initializeCollections();
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
  async saveEpisode(userId: string, conversation: { user: string