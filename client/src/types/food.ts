export interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  quantity: string;
  purchaseDate: Date;
  expirationDate: Date;
  freshness: 'fresh' | 'warning' | 'expired';
  category: string;
  confidence?: number; // OCR confidence score
}

export interface Receipt {
  id: string;
  storeName?: string;
  date: Date;
  items: FoodItem[];
  originalText?: string;
  imageUrl?: string;
}

export interface FoodDatabase {
  [key: string]: {
    shelfLife: number; // days
    category: string;
    variations: string[];
  };
}