import { FoodDatabase } from '../types/food';

export const foodDatabase: FoodDatabase = {
  // Fruits
  apple: { shelfLife: 7, category: 'Fruit', variations: ['apples', 'apple', 'gala apple', 'red apple', 'green apple', 'honeycrisp'] },
  banana: { shelfLife: 5, category: 'Fruit', variations: ['bananas', 'banana', 'organic banana'] },
  orange: { shelfLife: 7, category: 'Fruit', variations: ['oranges', 'orange', 'naval orange', 'blood orange'] },
  grape: { shelfLife: 5, category: 'Fruit', variations: ['grapes', 'grape', 'red grapes', 'green grapes'] },
  strawberry: { shelfLife: 3, category: 'Fruit', variations: ['strawberries', 'strawberry', 'fresh strawberries'] },
  blueberry: { shelfLife: 5, category: 'Fruit', variations: ['blueberries', 'blueberry', 'fresh blueberries'] },
  raspberry: { shelfLife: 2, category: 'Fruit', variations: ['raspberries', 'raspberry', 'fresh raspberries'] },
  lemon: { shelfLife: 14, category: 'Fruit', variations: ['lemons', 'lemon', 'fresh lemon'] },
  lime: { shelfLife: 14, category: 'Fruit', variations: ['limes', 'lime', 'fresh lime'] },
  avocado: { shelfLife: 3, category: 'Fruit', variations: ['avocados', 'avocado', 'hass avocado'] },
  watermelon: { shelfLife: 7, category: 'Fruit', variations: ['watermelon', 'watermelons', 'fresh watermelon'] },
  cantaloupe: { shelfLife: 5, category: 'Fruit', variations: ['cantaloupe', 'cantaloupes', 'fresh cantaloupe'] },

  // Vegetables
  tomato: { shelfLife: 5, category: 'Vegetable', variations: ['tomatoes', 'tomato', 'fresh tomatoes', 'roma tomato'] },
  potato: { shelfLife: 14, category: 'Vegetable', variations: ['potatoes', 'potato', 'russet potato', 'red potato'] },
  onion: { shelfLife: 21, category: 'Vegetable', variations: ['onions', 'onion', 'yellow onion', 'white onion', 'red onion'] },
  carrot: { shelfLife: 21, category: 'Vegetable', variations: ['carrots', 'carrot', 'baby carrots', 'fresh carrots'] },
  lettuce: { shelfLife: 5, category: 'Vegetable', variations: ['lettuce', 'romaine lettuce', 'iceberg lettuce'] },
  spinach: { shelfLife: 5, category: 'Vegetable', variations: ['spinach', 'fresh spinach', 'baby spinach'] },
  broccoli: { shelfLife: 5, category: 'Vegetable', variations: ['broccoli', 'fresh broccoli', 'broccoli crowns'] },
  cucumber: { shelfLife: 7, category: 'Vegetable', variations: ['cucumber', 'cucumbers', 'fresh cucumber'] },
  bell_pepper: { shelfLife: 7, category: 'Vegetable', variations: ['bell pepper', 'red pepper', 'green pepper', 'yellow pepper', 'peppers'] },

  // Proteins
  chicken: { shelfLife: 2, category: 'Protein', variations: ['chicken', 'chicken breast', 'chicken thigh', 'whole chicken'] },
  beef: { shelfLife: 3, category: 'Protein', variations: ['beef', 'ground beef', 'beef steak', 'chuck roast'] },
  pork: { shelfLife: 3, category: 'Protein', variations: ['pork', 'pork chops', 'pork tenderloin', 'ground pork'] },
  salmon: { shelfLife: 2, category: 'Protein', variations: ['salmon', 'salmon fillet', 'fresh salmon', 'atlantic salmon'] },
  eggs: { shelfLife: 21, category: 'Protein', variations: ['eggs', 'egg', 'dozen eggs', 'large eggs'] },

  // Dairy
  milk: { shelfLife: 7, category: 'Dairy', variations: ['milk', 'whole milk', '2% milk', 'skim milk', 'almond milk'] },
  cheese: { shelfLife: 14, category: 'Dairy', variations: ['cheese', 'cheddar cheese', 'mozzarella', 'swiss cheese'] },
  yogurt: { shelfLife: 10, category: 'Dairy', variations: ['yogurt', 'greek yogurt', 'vanilla yogurt', 'strawberry yogurt'] },
  butter: { shelfLife: 30, category: 'Dairy', variations: ['butter', 'unsalted butter', 'salted butter'] },

  // Grains & Pantry
  bread: { shelfLife: 5, category: 'Grains', variations: ['bread', 'white bread', 'wheat bread', 'whole grain bread'] },
  rice: { shelfLife: 365, category: 'Grains', variations: ['rice', 'white rice', 'brown rice', 'jasmine rice'] },
  pasta: { shelfLife: 365, category: 'Grains', variations: ['pasta', 'spaghetti', 'penne', 'macaroni'] },
  cereal: { shelfLife: 90, category: 'Grains', variations: ['cereal', 'cheerios', 'corn flakes', 'granola'] }
};

export function findFoodItem(itemName: string): { shelfLife: number; category: string } | null {
  const normalizedName = itemName.toLowerCase().trim();

  // Direct match
  if (foodDatabase[normalizedName]) {
    return {
      shelfLife: foodDatabase[normalizedName].shelfLife,
      category: foodDatabase[normalizedName].category
    };
  }

  // Check variations
  for (const [key, value] of Object.entries(foodDatabase)) {
    if (value.variations.some(variation =>
      normalizedName.includes(variation.toLowerCase()) ||
      variation.toLowerCase().includes(normalizedName)
    )) {
      return {
        shelfLife: value.shelfLife,
        category: value.category
      };
    }
  }

  // Default for unknown items that made it through filtering
  return { shelfLife: 7, category: 'Other' };
}