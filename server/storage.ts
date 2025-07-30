import { type FoodItem, type InsertFoodItem, type Recipe, type InsertRecipe, type User, type InsertUser, users, foodItems, recipes } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Food item methods
  getFoodItems(): Promise<FoodItem[]>;
  getFoodItem(id: string): Promise<FoodItem | undefined>;
  createFoodItem(item: InsertFoodItem): Promise<FoodItem>;
  updateFoodItem(id: string, item: Partial<InsertFoodItem>): Promise<FoodItem | undefined>;
  deleteFoodItem(id: string): Promise<boolean>;
  
  // Recipe methods
  getRecipes(): Promise<Recipe[]>;
  getRecipe(id: string): Promise<Recipe | undefined>;
  createRecipe(recipe: InsertRecipe): Promise<Recipe>;
  updateRecipe(id: string, recipe: Partial<InsertRecipe>): Promise<Recipe | undefined>;
  deleteRecipe(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private foodItems: Map<string, FoodItem>;
  private recipes: Map<string, Recipe>;

  constructor() {
    this.users = new Map();
    this.foodItems = new Map();
    this.recipes = new Map();
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      firstName: insertUser.firstName ?? null,
      lastName: insertUser.lastName ?? null,
      dietaryRestrictions: insertUser.dietaryRestrictions ?? null,
      preferredCuisines: insertUser.preferredCuisines ?? null,
      sustainabilityGoals: insertUser.sustainabilityGoals ?? null
    };
    this.users.set(id, user);
    return user;
  }

  // Food item methods
  async getFoodItems(): Promise<FoodItem[]> {
    return Array.from(this.foodItems.values()).sort((a, b) => 
      new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
    );
  }

  async getFoodItem(id: string): Promise<FoodItem | undefined> {
    return this.foodItems.get(id);
  }

  async createFoodItem(insertItem: InsertFoodItem): Promise<FoodItem> {
    const id = randomUUID();
    const item: FoodItem = { 
      ...insertItem, 
      id, 
      addedAt: new Date(),
      imageUrl: insertItem.imageUrl ?? null,
      category: insertItem.category ?? null,
      storageTips: insertItem.storageTips ?? null,
      estimatedShelfLife: insertItem.estimatedShelfLife ?? null,
      isFromReceipt: insertItem.isFromReceipt ?? null
    };
    this.foodItems.set(id, item);
    return item;
  }

  async updateFoodItem(id: string, updateData: Partial<InsertFoodItem>): Promise<FoodItem | undefined> {
    const existingItem = this.foodItems.get(id);
    if (!existingItem) return undefined;

    const updatedItem: FoodItem = { ...existingItem, ...updateData };
    this.foodItems.set(id, updatedItem);
    return updatedItem;
  }

  async deleteFoodItem(id: string): Promise<boolean> {
    return this.foodItems.delete(id);
  }

  // Recipe methods
  async getRecipes(): Promise<Recipe[]> {
    return Array.from(this.recipes.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getRecipe(id: string): Promise<Recipe | undefined> {
    return this.recipes.get(id);
  }

  async createRecipe(insertRecipe: InsertRecipe): Promise<Recipe> {
    const id = randomUUID();
    const recipe: Recipe = { 
      ...insertRecipe, 
      id, 
      createdAt: new Date(),
      imageUrl: insertRecipe.imageUrl ?? null,
      description: insertRecipe.description ?? null,
      isSaved: insertRecipe.isSaved ?? false,
      dietaryTags: insertRecipe.dietaryTags ?? null,
      cuisineType: insertRecipe.cuisineType ?? null,
      difficulty: insertRecipe.difficulty ?? null,
      servings: insertRecipe.servings ?? null,
      isAiGenerated: insertRecipe.isAiGenerated ?? null
    };
    this.recipes.set(id, recipe);
    return recipe;
  }

  async updateRecipe(id: string, updateData: Partial<InsertRecipe>): Promise<Recipe | undefined> {
    const existingRecipe = this.recipes.get(id);
    if (!existingRecipe) return undefined;

    const updatedRecipe: Recipe = { ...existingRecipe, ...updateData };
    this.recipes.set(id, updatedRecipe);
    return updatedRecipe;
  }

  async deleteRecipe(id: string): Promise<boolean> {
    return this.recipes.delete(id);
  }
}

// rewrite MemStorage to DatabaseStorage
export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Food item methods
  async getFoodItems(): Promise<FoodItem[]> {
    return await db.select().from(foodItems).orderBy(desc(foodItems.addedAt));
  }

  async getFoodItem(id: string): Promise<FoodItem | undefined> {
    const [item] = await db.select().from(foodItems).where(eq(foodItems.id, id));
    return item || undefined;
  }

  async createFoodItem(insertItem: InsertFoodItem): Promise<FoodItem> {
    const [item] = await db
      .insert(foodItems)
      .values(insertItem)
      .returning();
    return item;
  }

  async updateFoodItem(id: string, updateData: Partial<InsertFoodItem>): Promise<FoodItem | undefined> {
    const [item] = await db
      .update(foodItems)
      .set(updateData)
      .where(eq(foodItems.id, id))
      .returning();
    return item || undefined;
  }

  async deleteFoodItem(id: string): Promise<boolean> {
    const result = await db.delete(foodItems).where(eq(foodItems.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Recipe methods
  async getRecipes(): Promise<Recipe[]> {
    return await db.select().from(recipes).orderBy(desc(recipes.createdAt));
  }

  async getRecipe(id: string): Promise<Recipe | undefined> {
    const [recipe] = await db.select().from(recipes).where(eq(recipes.id, id));
    return recipe || undefined;
  }

  async createRecipe(insertRecipe: InsertRecipe): Promise<Recipe> {
    const [recipe] = await db
      .insert(recipes)
      .values(insertRecipe)
      .returning();
    return recipe;
  }

  async updateRecipe(id: string, updateData: Partial<InsertRecipe>): Promise<Recipe | undefined> {
    const [recipe] = await db
      .update(recipes)
      .set(updateData)
      .where(eq(recipes.id, id))
      .returning();
    return recipe || undefined;
  }

  async deleteRecipe(id: string): Promise<boolean> {
    const result = await db.delete(recipes).where(eq(recipes.id, id));
    return (result.rowCount ?? 0) > 0;
  }
}

export const storage = new DatabaseStorage();
