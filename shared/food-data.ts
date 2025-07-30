// Food shelf life and storage data based on FreshAI requirements

export interface FoodShelfLife {
  category: string;
  averageDays: number;
  storageTips: string;
}

export const FOOD_SHELF_LIFE_DATA: Record<string, FoodShelfLife> = {
  // Fruits
  "apples": { category: "fruits", averageDays: 30, storageTips: "Store in refrigerator crisper drawer. Keep away from other fruits that produce ethylene gas." },
  "bananas": { category: "fruits", averageDays: 7, storageTips: "Store at room temperature. Refrigerate when ripe to slow ripening." },
  "oranges": { category: "fruits", averageDays: 14, storageTips: "Store in refrigerator or cool, dry place. Keep in perforated plastic bag." },
  "strawberries": { category: "fruits", averageDays: 5, storageTips: "Store in refrigerator unwashed. Don't remove stems until ready to eat." },
  "avocados": { category: "fruits", averageDays: 5, storageTips: "Ripen at room temperature, then refrigerate. Store cut avocado with lemon juice." },
  
  // Vegetables
  "lettuce": { category: "vegetables", averageDays: 7, storageTips: "Store in refrigerator crisper drawer in perforated plastic bag. Keep dry." },
  "tomatoes": { category: "vegetables", averageDays: 7, storageTips: "Store ripe tomatoes at room temperature. Refrigerate only when very ripe." },
  "carrots": { category: "vegetables", averageDays: 21, storageTips: "Remove green tops and store in refrigerator crisper drawer in plastic bag." },
  "spinach": { category: "vegetables", averageDays: 5, storageTips: "Store in refrigerator in original container or perforated plastic bag." },
  "potatoes": { category: "vegetables", averageDays: 30, storageTips: "Store in cool, dark, well-ventilated place. Avoid refrigerator and sunlight." },
  "onions": { category: "vegetables", averageDays: 30, storageTips: "Store in cool, dry, well-ventilated place. Keep away from potatoes." },
  
  // Dairy
  "milk": { category: "dairy", averageDays: 7, storageTips: "Store in coldest part of refrigerator, not in door. Keep in original container." },
  "cheese": { category: "dairy", averageDays: 14, storageTips: "Wrap hard cheese in wax paper, soft cheese in plastic. Store in refrigerator." },
  "yogurt": { category: "dairy", averageDays: 14, storageTips: "Store in refrigerator at consistent temperature. Keep sealed until ready to use." },
  "eggs": { category: "dairy", averageDays: 21, storageTips: "Store in refrigerator in original carton on a shelf, not in door." },
  
  // Meat & Protein
  "chicken": { category: "meat", averageDays: 2, storageTips: "Store in coldest part of refrigerator. Use within 1-2 days or freeze." },
  "beef": { category: "meat", averageDays: 3, storageTips: "Store in coldest part of refrigerator. Use within 3-5 days or freeze." },
  "fish": { category: "meat", averageDays: 1, storageTips: "Store in coldest part of refrigerator on ice. Use within 1-2 days." },
  "tofu": { category: "protein", averageDays: 5, storageTips: "Store opened tofu in water in refrigerator. Change water daily." },
  
  // Grains & Pantry
  "bread": { category: "grains", averageDays: 7, storageTips: "Store in cool, dry place. Freeze for longer storage." },
  "rice": { category: "grains", averageDays: 365, storageTips: "Store in airtight container in cool, dry place away from pests." },
  "pasta": { category: "grains", averageDays: 730, storageTips: "Store in original package or airtight container in cool, dry place." },
  
  // Default fallback
  "other": { category: "other", averageDays: 7, storageTips: "Check product packaging for specific storage instructions." }
};

export function estimateShelfLife(itemName: string): FoodShelfLife {
  const normalizedName = itemName.toLowerCase().trim();
  
  // Try exact match first
  if (FOOD_SHELF_LIFE_DATA[normalizedName]) {
    return FOOD_SHELF_LIFE_DATA[normalizedName];
  }
  
  // Try partial matches
  for (const [key, data] of Object.entries(FOOD_SHELF_LIFE_DATA)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      return data;
    }
  }
  
  // Default fallback
  return FOOD_SHELF_LIFE_DATA.other;
}

export function categorizeFood(itemName: string): string {
  const shelfLife = estimateShelfLife(itemName);
  return shelfLife.category;
}

export function getStorageTips(itemName: string): string {
  const shelfLife = estimateShelfLife(itemName);
  return shelfLife.storageTips;
}

// Get expiration status with sustainability focus
export function getExpirationStatusWithSustainability(expirationDate: Date) {
  const now = new Date();
  const diffTime = expirationDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return {
      status: 'expired' as const,
      urgency: 'critical' as const,
      message: `Expired ${Math.abs(diffDays)} days ago`,
      actionMessage: 'Check if still safe to use or compost responsibly',
      color: 'text-red-400',
      dotColor: 'bg-red-500'
    };
  } else if (diffDays === 0) {
    return {
      status: 'expiring' as const,
      urgency: 'high' as const,
      message: 'Expires today',
      actionMessage: 'Use immediately or preserve (freeze/cook)',
      color: 'text-orange-400',
      dotColor: 'bg-orange-500'
    };
  } else if (diffDays <= 2) {
    return {
      status: 'expiring' as const,
      urgency: 'high' as const,
      message: `Expires in ${diffDays} day${diffDays > 1 ? 's' : ''}`,
      actionMessage: 'Perfect for recipe suggestions!',
      color: 'text-orange-400',
      dotColor: 'bg-orange-500'
    };
  } else if (diffDays <= 7) {
    return {
      status: 'fresh' as const,
      urgency: 'medium' as const,
      message: `${diffDays} days left`,
      actionMessage: 'Plan meals to use soon',
      color: 'text-yellow-400',
      dotColor: 'bg-yellow-500'
    };
  } else {
    return {
      status: 'fresh' as const,
      urgency: 'low' as const,
      message: `Fresh for ${diffDays} days`,
      actionMessage: 'Store properly to maintain freshness',
      color: 'text-emerald-400',
      dotColor: 'bg-emerald-500'
    };
  }
}