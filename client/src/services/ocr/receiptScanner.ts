import { createWorker } from 'tesseract.js';
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
      this.worker = await createWorker('eng');
      await this.worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,!?@#$%&*()[]{}|\\:;"\'-_+=/<>',
        tessedit_pageseg_mode: 6, // Uniform block of text
      });
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize OCR worker:', error);
      throw new Error('Failed to initialize receipt scanner');
    }
  }

  async scanReceipt(imageFile: File): Promise<ScanResult> {
    if (!this.worker) {
      throw new Error('OCR worker not initialized');
    }

    try {
      const { data: { text, confidence } } = await this.worker.recognize(imageFile);
      const items = this.processReceiptText(text);
      
      return {
        items,
        originalText: text,
        confidence: confidence || 0
      };
    } catch (error) {
      console.error('OCR scanning failed:', error);
      throw new Error('Failed to scan receipt');
    }
  }

  private processReceiptText(text: string): FoodItem[] {
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

    return items;
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