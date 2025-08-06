import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const foodItems = pgTable("food_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  quantity: text("quantity").notNull(),
  expirationDate: timestamp("expiration_date").notNull(),
  imageUrl: text("image_url"),
  category: text("category"),
  storageTips: text("storage_tips"),
  estimatedShelfLife: integer("estimated_shelf_life"), // days
  isFromReceipt: boolean("is_from_receipt").default(false),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

export const recipes = pgTable("recipes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  cookTime: text("cook_time").notNull(),
  imageUrl: text("image_url"),
  ingredients: text("ingredients").array().notNull(),
  instructions: text("instructions").array().notNull(),
  missingIngredients: text("missing_ingredients").array(),
  source: text("source"),
  dietaryTags: text("dietary_tags").array(), // gluten-free, vegan, etc.
  cuisineType: text("cuisine_type"), // Italian, Asian, etc.
  difficulty: text("difficulty"), // Easy, Medium, Hard
  servings: integer("servings"),
  isAiGenerated: boolean("is_ai_generated").default(false),
  isSaved: boolean("is_saved").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  dietaryRestrictions: text("dietary_restrictions").array(), // allergies, preferences
  preferredCuisines: text("preferred_cuisines").array(),
  sustainabilityGoals: text("sustainability_goals"),
});

// New table for tracking sustainability metrics
export const sustainabilityMetrics = pgTable("sustainability_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  month: text("month").notNull(), // YYYY-MM format
  itemsSaved: integer("items_saved").default(0),
  estimatedMoneySaved: integer("estimated_money_saved").default(0), // cents
  wasteReduced: integer("waste_reduced").default(0), // grams
  recipesGenerated: integer("recipes_generated").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// New table for notifications
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  type: text("type").notNull(), // expiring, expired, recipe_suggestion
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  relatedItemId: varchar("related_item_id"), // food item or recipe id
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFoodItemSchema = createInsertSchema(foodItems).omit({
  id: true,
  addedAt: true,
}).extend({
  expirationDate: z.union([z.date(), z.string().transform(str => new Date(str))]),
});

export const insertRecipeSchema = createInsertSchema(recipes).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export type InsertFoodItem = z.infer<typeof insertFoodItemSchema>;
export type FoodItem = typeof foodItems.$inferSelect;
export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type Recipe = typeof recipes.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
