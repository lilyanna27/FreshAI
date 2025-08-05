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
      if (OCRCorrection.isLikelyMisread(itemName) || this.isGibberishLine(itemName)) {
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

    // If no valid food items found, likely gibberish or not a grocery receipt
    if (items.length === 0) {
      if (lines.length > 10) {
        throw new Error('No food items found in receipt. Please ensure the image is clear and contains grocery items.');
      } else {
        throw new Error('Unable to read receipt clearly. Please try a clearer image or different angle.');
      }
    }

    return items;
  }

  private isGibberish(text: string): boolean {
    // Check for signs of poor OCR quality
    const totalChars = text.length;
    if (totalChars < 10) return true;

    // Count problematic patterns that indicate poor OCR
    const gibberishPatterns = [
      /[|\\\/]{2,}/g,   // Multiple slashes/pipes like || or ///
      /[;:]{2,}/g,      // Multiple colons/semicolons  
      /\s[a-z]\s/g,     // Single letters surrounded by spaces
      /[A-Z]{4,}/g,     // Too many consecutive capitals (lowered from 6)
      /\s{3,}/g,        // Excessive whitespace (lowered from 5)
      /[^\w\s$.,()-]{2,}/g, // Multiple special chars together (lowered from 3)
      /[[\]{}]{1,}/g,   // Square/curly brackets (common OCR errors)
      /[><!@#%&*+=]{2,}/g // Multiple symbols together
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
    
    // Check for recognizable words - be more strict
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length >= 2);
    const commonReceiptWords = ['total', 'tax', 'subtotal', 'save', 'price', 'qty', 'each', 'item', 'food', 'store', 'market', 'grocery', 'banana', 'apple', 'milk', 'bread'];
    const recognizableWords = words.filter(word => 
      commonReceiptWords.includes(word) || 
      (/^[a-z]{4,}$/.test(word) && !word.match(/[aeiouy]{4,}/)) // Valid English-looking words (4+ chars, not all vowels)
    );
    
    const wordRatio = recognizableWords.length / Math.max(words.length, 1);
    
    console.log('Gibberish analysis:', {
      gibberishRatio: gibberishRatio.toFixed(3),
      wordRatio: wordRatio.toFixed(3),
      totalChars,
      recognizableWords: recognizableWords.length,
      totalWords: words.length,
      isGibberish: gibberishRatio > 0.15 || wordRatio < 0.2 // Made more strict
    });

    // Mark as gibberish if too many problematic patterns or too few recognizable words
    return gibberishRatio > 0.15 || wordRatio < 0.2; // Stricter thresholds
  }

  private isGibberishLine(line: string): boolean {
    // Check individual lines for gibberish patterns
    if (line.length < 3) return true;
    
    // Common gibberish patterns in individual lines
    const linePatterns = [
      /[|\\\/;:]{1,}/,     // Any pipes, slashes, colons, semicolons
      /\s[a-z]\s/,         // Single letters with spaces
      /[[\]{}]/,           // Brackets
      /[><!@#%&*+=]{1,}/,  // Symbol characters
      /^[A-Z\s]{5,}$/,     // All caps with spaces
      /\s{2,}/             // Multiple spaces
    ];
    
    // Count how many patterns match
    let patternMatches = 0;
    for (const pattern of linePatterns) {
      if (pattern.test(line)) {
        patternMatches++;
      }
    }
    
    // If line has 2+ gibberish patterns, it's likely gibberish
    if (patternMatches >= 2) return true;
    
    // Check for lack of vowels (common in OCR errors)
    const vowelCount = (line.match(/[aeiouAEIOU]/g) || []).length;
    const consonantCount = (line.match(/[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]/g) || []).length;
    
    // If too few vowels relative to consonants, likely gibberish
    if (consonantCount > 3 && vowelCount / consonantCount < 0.2) return true;
    
    return false;
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