import Database from 'better-sqlite3';
import path from 'path';

interface UserPreference {
  user_id: string;
  preference_key: string;
  preference_value: string;
  frequency: number;
  timestamp: string;
}

interface PreferenceResult {
  status: 'success' | 'error';
  message?: string;
  preferences?: { [key: string]: string };
}

class MemorySystem {
  private db: Database.Database;

  constructor() {
    // Create database in project root
    const dbPath = path.join(process.cwd(), 'user_memory.db');
    this.db = new Database(dbPath);
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    try {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS user_preferences (
          user_id TEXT,
          preference_key TEXT,
          preference_value TEXT,
          frequency INTEGER DEFAULT 1,
          timestamp TEXT,
          PRIMARY KEY (user_id, preference_key)
        )
      `);
    } catch (error) {
      console.error('Failed to initialize memory database:', error);
    }
  }

  savePreference(userId: string, key: string, value: string): PreferenceResult {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO user_preferences (user_id, preference_key, preference_value, frequency, timestamp)
        VALUES (?, ?, ?, 1, ?)
        ON CONFLICT(user_id, preference_key)
        DO UPDATE SET 
          preference_value = ?,
          frequency = frequency + 1,
          timestamp = ?
      `);
      
      const timestamp = new Date().toISOString();
      stmt.run(userId, key, value, timestamp, value, timestamp);
      
      return {
        status: 'success',
        message: `Saved ${key}=${value} for user ${userId}`
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Failed to save preference: ${error}`
      };
    }
  }

  getPreferences(userId: string): PreferenceResult {
    try {
      const stmt = this.db.prepare(`
        SELECT preference_key, preference_value, frequency
        FROM user_preferences
        WHERE user_id = ?
        ORDER BY frequency DESC, timestamp DESC
      `);
      
      const rows = stmt.all(userId) as { preference_key: string; preference_value: string; frequency: number }[];
      const preferences: { [key: string]: string } = {};
      
      rows.forEach(row => {
        preferences[row.preference_key] = row.preference_value;
      });
      
      return {
        status: 'success',
        preferences
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Failed to retrieve preferences: ${error}`
      };
    }
  }

  // Save multiple items with a specific type (e.g., dislikes, likes, cuisines)
  savePreferenceList(userId: string, type: string, items: string[]): void {
    items.forEach(item => {
      this.savePreference(userId, `${type}_${item.toLowerCase()}`, item);
    });
  }

  // Get all items of a specific type
  getPreferenceList(userId: string, type: string): string[] {
    const result = this.getPreferences(userId);
    if (result.status === 'success' && result.preferences) {
      return Object.entries(result.preferences)
        .filter(([key, _]) => key.startsWith(`${type}_`))
        .map(([_, value]) => value);
    }
    return [];
  }

  // Smart learning from natural language
  extractAndSavePreferences(userId: string, text: string): {
    newDislikes: string[];
    newLikes: string[];
    newCuisines: string[];
    newDietary: string[];
  } {
    const lowerText = text.toLowerCase();
    const result = {
      newDislikes: [] as string[],
      newLikes: [] as string[],
      newCuisines: [] as string[],
      newDietary: [] as string[]
    };

    // Extract dislikes with various patterns
    const dislikePatterns = [
      /i don't like ([^,.!?]+)/g,
      /i hate ([^,.!?]+)/g,
      /no ([^,.!?]+)/g,
      /not a fan of ([^,.!?]+)/g,
      /avoid ([^,.!?]+)/g,
      /allergic to ([^,.!?]+)/g,
      /can't eat ([^,.!?]+)/g
    ];

    dislikePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(lowerText)) !== null) {
        const disliked = match[1].trim();
        if (!this.getPreferenceList(userId, 'dislike').includes(disliked)) {
          this.savePreference(userId, `dislike_${disliked}`, disliked);
          result.newDislikes.push(disliked);
        }
      }
    });

    // Extract likes
    const likePatterns = [
      /i love ([^,.!?]+)/g,
      /i really like ([^,.!?]+)/g,
      /my favorite is ([^,.!?]+)/g,
      /i enjoy ([^,.!?]+)/g
    ];

    likePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(lowerText)) !== null) {
        const liked = match[1].trim();
        if (!this.getPreferenceList(userId, 'like').includes(liked)) {
          this.savePreference(userId, `like_${liked}`, liked);
          result.newLikes.push(liked);
        }
      }
    });

    // Extract cuisine preferences
    const cuisineTypes = ['italian', 'asian', 'chinese', 'japanese', 'mexican', 'indian', 'thai', 'mediterranean', 'french', 'american', 'korean', 'vietnamese', 'greek', 'spanish', 'turkish'];
    cuisineTypes.forEach(cuisine => {
      if (lowerText.includes(cuisine)) {
        if (!this.getPreferenceList(userId, 'cuisine').includes(cuisine)) {
          this.savePreference(userId, `cuisine_${cuisine}`, cuisine);
          result.newCuisines.push(cuisine);
        }
      }
    });

    // Extract dietary restrictions
    const dietaryTerms = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'keto', 'paleo', 'low-carb'];
    dietaryTerms.forEach(dietary => {
      if (lowerText.includes(dietary) || lowerText.includes(dietary.replace('-', ' '))) {
        if (!this.getPreferenceList(userId, 'dietary').includes(dietary)) {
          this.savePreference(userId, `dietary_${dietary}`, dietary);
          result.newDietary.push(dietary);
        }
      }
    });

    return result;
  }

  // Get organized user profile
  getUserProfile(userId: string): {
    dislikes: string[];
    likes: string[];
    cuisines: string[];
    dietary: string[];
  } {
    return {
      dislikes: this.getPreferenceList(userId, 'dislike'),
      likes: this.getPreferenceList(userId, 'like'),
      cuisines: this.getPreferenceList(userId, 'cuisine'),
      dietary: this.getPreferenceList(userId, 'dietary')
    };
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
  return Array.from(new Set(substitutes)); // Remove duplicates
}

// Create singleton instance
export const memorySystem = new MemorySystem();