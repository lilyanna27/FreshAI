import { createWorker } from 'tesseract.js';
import type * as Tesseract from 'tesseract.js';
import { OCRCorrection } from './ocrCorrection';
import { ReceiptFilters } from './receiptFilters';
import { findFoodItem } from '../../data/foodDatabase';
import type { FoodItem, Receipt } from '../../types/food';

export interface ScanResult {
  items: FoodItem[];
  originalText: string;
  confidence: number;
}

export class ReceiptScanner {
  private worker: Tesseract.Worker | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('Creating OCR worker...');
      this.worker = await createWorker('eng');
      console.log('OCR worker created, setting parameters...');
      await this.worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,!?@#$%&*()[]{}|\\:;"\'-_+=/<>',
        tessedit_pageseg_mode: '6' as any, // Uniform block of text
      });
      console.log('OCR worker initialized successfully');
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize OCR worker:', error);
      throw new Error(`Failed to initialize receipt scanner: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async scanReceipt(imageFile: File): Promise<ScanResult> {
    if (!this.worker) {
      throw new Error('OCR worker not initialized');
    }

    try {
      console.log('Starting OCR recognition on file:', imageFile.name);
      const { data: { text, confidence } } = await this.worker.recognize(imageFile);
      console.log('OCR text extracted:', text.substring(0, 200) + '...');
      console.log('OCR confidence:', confidence);
      
      const items = this.processReceiptText(text);
      console.log('Processed items:', items);
      
      return {
        items,
        originalText: text,
        confidence: confidence || 0
      };
    } catch (error) {
      console.error('OCR scanning failed:', error);
      throw new Error(`Failed to scan receipt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private processReceiptText(text: string): FoodItem[] {
    // First check if the text looks like valid receipt content
    if (this.isGibberish(text)) {
      throw new Error('Unable to read receipt clearly. Please try a clearer image or different angle.');
    }

    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const items: FoodItem[] = [];
    
    for (const line of lines) {
      // Skip non-food lines
      if (ReceiptFilters.isNonFoodLine(line)) {
        continue;
      }

      // Only process lines that have price information or are likely food items
      if (!ReceiptFilters.hasPrice(line) && !ReceiptFilters.isFoodItem(line)) {
        continue;
      }

      // Extract item name
      let itemName = ReceiptFilters.extractItemName(line);
      if (!itemName || itemName.length < 2) {
        continue;
      }

      // Apply OCR corrections
      itemName = OCRCorrection.correctItemName(itemName);

      // Skip if still looks like misread text
      if (OCRCorrection.isLikelyMisread(itemName)) {
        continue;
      }

      // Find food item in database
      const foodInfo = findFoodItem(itemName);
      if (!foodInfo) {
        continue; // Skip items not in our food database
      }

      // Calculate expiration date
      const purchaseDate = new Date();
      const expirationDate = new Date();
      expirationDate.setDate(purchaseDate.getDate() + foodInfo.shelfLife);

      // Determine freshness
      const daysUntilExpiration = Math.ceil(
        (expirationDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      let freshness: 'fresh' | 'warning' | 'expired' = 'fresh';
      if (daysUntilExpiration <= 0) {
        freshness = 'expired';
      } else if (daysUntilExpiration <= 3) {
        freshness = 'warning';
      }

      const foodItem: FoodItem = {
        id: Math.random().toString(36).substr(2, 9),
        name: itemName,
        quantity: '1', // Default quantity
        purchaseDate,
        expirationDate,
        freshness,
        category: foodInfo.category,
        confidence: 0.8 // Default confidence for processed items
      };

      items.push(foodItem);
    }

    // If no valid food items found, likely gibberish
    if (items.length === 0 && lines.length > 5) {
      throw new Error('No food items found in receipt. Please ensure the image is clear and contains grocery items.');
    }

    return items;
  }

  private isGibberish(text: string): boolean {
    // Check for signs of poor OCR quality
    const totalChars = text.length;
    if (totalChars < 10) return true;

    // Count problematic patterns that indicate poor OCR
    const gibberishPatterns = [
      /[|\\\/]{3,}/g,  // Multiple slashes/pipes like |||
      /[;:]{3,}/g,      // Multiple colons/semicolons  
      /\s[a-z]\s/g,     // Single letters surrounded by spaces
      /[A-Z]{6,}/g,     // Too many consecutive capitals
      /\s{5,}/g,        // Excessive whitespace
      /[^\w\s$.,()-]{3,}/g // Multiple special chars together
    ];

    let gibberishCount = 0;
    for (const pattern of gibberishPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        gibberishCount += matches.join('').length;
      }
    }

    // Calculate ratio of gibberish characters
    const gibberishRatio = gibberishCount / totalChars;
    
    // Check for recognizable words
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length >= 2);
    const commonReceiptWords = ['total', 'tax', 'subtotal', 'save', 'price', 'qty', 'each', 'item', 'food', 'store', 'market', 'grocery'];
    const recognizableWords = words.filter(word => 
      commonReceiptWords.includes(word) || 
      /^[a-z]{3,}$/.test(word) // Valid English-looking words
    );
    
    const wordRatio = recognizableWords.length / Math.max(words.length, 1);
    
    console.log('Gibberish analysis:', {
      gibberishRatio: gibberishRatio.toFixed(3),
      wordRatio: wordRatio.toFixed(3),
      totalChars,
      recognizableWords: recognizableWords.length,
      totalWords: words.length,
      isGibberish: gibberishRatio > 0.3 || wordRatio < 0.1
    });

    // Mark as gibberish if too many problematic patterns or too few recognizable words
    return gibberishRatio > 0.3 || wordRatio < 0.1;
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
    }
  }
}

// Singleton instance
export const receiptScanner = new ReceiptScanner();