import { createWorker } from 'tesseract.js';
import { FoodItem } from '../../types/food';
import { findFoodItem } from '../../data/foodDatabase';

// ============= OCR CORRECTION UTILITIES =============
export class OCRCorrection {
  
  // Common OCR errors and their corrections
  private static corrections: Record<string, string> = {
    // Common letter substitutions
    'watrmelon': 'watermelon',
    'watennelon': 'watermelon',
    'waterrnekm': 'watermelon',
    'elon': 'melon',
    'banna': 'banana',
    'bananna': 'banana',
    'bannana': 'banana',
    'banan': 'banana',
    'appl': 'apple',
    'aple': 'apple',
    'organe': 'orange',
    'orang': 'orange',
    'orangs': 'orange',
    'tomatoe': 'tomato',
    'tormato': 'tomato',
    'potatos': 'potato',
    'potatoe': 'potato',
    'onions': 'onion',
    'carrots': 'carrot',
    'chickin': 'chicken',
    'chiken': 'chicken',
    'chickn': 'chicken',
    'beaf': 'beef',
    'hamm': 'ham',
    'bakon': 'bacon',
    'egss': 'eggs',
    'egges': 'eggs',
    'milkk': 'milk',
    'chees': 'cheese',
    'cheeze': 'cheese',
    'buttr': 'butter',
    'butterr': 'butter',
    'bred': 'bread',
    'breadd': 'bread',
    'riee': 'rice',
    'riec': 'rice',
    'cereall': 'cereal',
    'cerael': 'cereal',
    'yoghurt': 'yogurt',
    'yougurt': 'yogurt',
    
    // Common OCR character confusions
    'rn': 'm',
    'ln': 'h',
    'cl': 'd',
    'ii': 'll',
    '1l': 'll',
    'l1': 'll',
    '0': 'o',
    '5': 's',
    '6': 'g',
    '8': 'b'
  };

  static correctItemName(itemName: string): string {
    let corrected = itemName.toLowerCase().trim();
    
    // Apply direct corrections
    if (this.corrections[corrected]) {
      return this.corrections[corrected];
    }
    
    // Apply character-level corrections
    let result = corrected;
    for (const [wrong, correct] of Object.entries(this.corrections)) {
      if (wrong.length <= 2 && correct.length <= 2) { // Character substitutions
        result = result.replace(new RegExp(wrong, 'g'), correct);
      }
    }
    
    // Fix common patterns
    result = this.fixCommonPatterns(result);
    
    return result;
  }
  
  private static fixCommonPatterns(text: string): string {
    let result = text;
    
    // Fix doubled letters that should be single
    result = result.replace(/(.)\1{2,}/g, '$1$1'); // Keep max 2 of same letter
    
    // Fix common word endings
    result = result.replace(/rn/g, 'm'); // 'rn' often misread as 'm'
    result = result.replace(/ln/g, 'h'); // 'ln' often misread as 'h'
    
    // Fix spacing issues
    result = result.replace(/\s+/g, ' '); // Multiple spaces to single
    result = result.trim();
    
    return result;
  }
  
  static isLikelyMisread(itemName: string): boolean {
    const suspicious = [
      /^[a-z]{1,2}$/i, // Too short
      /^re$/i, // Common OCR fragment
      /^[a-z]{1,3}\s+[a-z]{1,3}$/i, // Two very short words
      /[a-z]{5,}[0-9]+[a-z]*/i, // Letters mixed with numbers
      /^[^aeiou]{3,}/i, // Too many consonants
      /[aeiou]{4,}/i, // Too many vowels together
    ];
    
    return suspicious.some(pattern => pattern.test(itemName));
  }
}

// ============= RECEIPT FILTERS =============
export class ReceiptFilters {
  
  static hasPrice(line: string): boolean {
    // Common price patterns (flexible to handle OCR errors)
    const pricePatterns = [
      /\$\s*\d+\.?\d*/,     // $1.99, $ 1.99, $1
      /\d+\.\d{2}\s*$/,     // 1.99 at end of line
      /\d+\s*@\s*\d+/,      // 2 @ 1.99
      /\d+\.\d{2}\s*[A-Z]/, // 1.99 F (with flag)
      /\b\d{1,3}\.\d{2}\b/, // General decimal price
    ];
    
    return pricePatterns.some(pattern => pattern.test(line));
  }

  static isNonFoodLine(line: string): boolean {
    // Comprehensive patterns for non-food lines including OCR garbage
    const nonFoodPatterns = [
      // Payment and totals
      /^(SUB)?TOTAL/i,
      /^TAX/i,
      /^CASH|CHANGE|CREDIT|DEBIT|PAYMENT/i,
      /^BALANCE|AMOUNT/i,
      /^VISA|MASTERCARD|AMEX/i,
      
      // Store info and receipt metadata  
      /STORE|LOCATION|ADDRESS/i,
      /PHONE|TEL:|FAX/i,
      /THANK\s+YOU|THANKS/i,
      /RECEIPT|TRANSACTION/i,
      /CASHIER|CLERK|OPERATOR/i,
      /REGISTER|LANE/i,
      /STREET|AVENUE|ROAD|BLVD|BOULEVARD/i,
      /VA\s+\d{5}|VIRGINIA/i,
      /CHARLOTTESVILLE|BAND\s+STREET/i,
      /DAILY|OPEN|HOURS/i,
      
      // Date and time patterns
      /^\d{1,2}\/\d{1,2}\/\d{2,4}/,
      /^\d{1,2}:\d{2}/,
      /^(MON|TUE|WED|THU|FRI|SAT|SUN)/i,
      /\d{4}\s+(BAND|STREET)/i,
      /PM\s+DAILY/i,
      
      // Customer service and promotions
      /CUSTOMER\s+SERVICE/i,
      /SATISFACTION\s+GUARANTEED/i,
      /RETURN\s+POLICY/i,
      /COUPON|DISCOUNT|SAVE/i,
      /SPECIAL\s+OFFER/i,
      
      // Non-food household items
      /TISSUE|TOILET\s+PAPER|TOWEL/i,
      /DETERGENT|SOAP|SHAMPOO/i,
      /BATTERY|BATTERIES/i,
      /MEDICINE|PHARMACY/i,
      
      // Common OCR artifacts and noise - ENHANCED
      /^[\*\-\=\+]{3,}/,    // Decorative characters
      /^\s*[A-Z]\s*$/,      // Single letters
      /^\d+\s*$/,           // Just numbers
      /^[^a-zA-Z]*$/,       // No letters at all
      
      // OCR garbage patterns that were showing up
      /employee|discount|senior|wessel|enployel|bpddbbiannnatiil|torpc|saved|pub|ben|poy|ere|rg|eba|aten|aal|ene|hase|saat|stn|bias|ett|laid|selhad|alr/i,
      /^ea\s+s\s+es/i,      // Specific gibberish pattern
      /^vee\s+saved/i,      // Another gibberish pattern
      /^[a-z]\s+[a-z]\s+[a-z]/i, // Single letters with spaces
      /diy|band|street|fo|lrarlotfesville|gri|ofen|ial|cochiang|jrean|cerrot/i, // Recent gibberish
      
      // Receipt footer patterns
      /VISIT\s+US|FOLLOW\s+US/i,
      /FACEBOOK|TWITTER|INSTAGRAM/i,
      /\.COM|WWW\./i,
      /SURVEY|FEEDBACK/i,
    ];
    
    return nonFoodPatterns.some(pattern => pattern.test(line));
  }

  static isValidItemName(name: string): boolean {
    // Must have minimum length
    if (name.length < 2) return false;
    
    // Must contain at least one letter
    if (!/[a-zA-Z]/.test(name)) return false;
    
    // Must contain at least one vowel (or y)
    if (!/[aeiouy]/i.test(name)) return false;
    
    // Should be mostly alphabetic
    const alphaRatio = (name.match(/[a-zA-Z]/g) || []).length / name.length;
    if (alphaRatio < 0.6) return false;
    
    // Reject common OCR garbage patterns
    const garbagePatterns = [
      /^[^aeiou]{4,}$/i,    // Too many consonants
      /^[aeiou]{3,}$/i,     // Too many vowels
      /(.)\1{3,}/,          // Too many repeated characters
      /^(re|er|en|an|el|le|te|et|se|es|st|ts)$/i, // Common OCR fragments
      /[|\\\/;:[\]{}]+/,    // Special characters that indicate OCR errors
    ];
    
    if (garbagePatterns.some(pattern => pattern.test(name))) return false;
    
    // Reject if too much capitalization (likely OCR error)
    const upperRatio = (name.match(/[A-Z]/g) || []).length / name.length;
    if (upperRatio > 0.7 && name.length > 3) return false;
    
    return true;
  }

  static isLikelyFoodItem(itemName: string): boolean {
    const name = itemName.toLowerCase();
    
    // Strong food keywords
    const foodKeywords = [
      // Fruits
      'apple', 'banana', 'orange', 'grape', 'berry', 'melon', 'peach', 'pear', 'cherry', 'plum',
      'lemon', 'lime', 'kiwi', 'mango', 'pineapple', 'strawberry', 'blueberry', 'raspberry',
      
      // Vegetables  
      'carrot', 'potato', 'onion', 'tomato', 'lettuce', 'spinach', 'broccoli', 'pepper', 'corn',
      'bean', 'pea', 'cucumber', 'celery', 'cabbage', 'mushroom',
      
      // Proteins
      'chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'turkey', 'ham', 'bacon', 'egg',
      'cheese', 'yogurt', 'milk',
      
      // Grains and pantry
      'bread', 'rice', 'pasta', 'cereal', 'flour', 'oat', 'wheat', 'bagel', 'muffin',
      
      // Common food terms
      'food', 'fresh', 'organic', 'natural'
    ];
    
    // Non-food keywords (should exclude)
    const nonFoodKeywords = [
      'battery', 'soap', 'shampoo', 'detergent', 'tissue', 'paper', 'towel',
      'medicine', 'vitamin', 'supplement', 'cleaner', 'bag', 'receipt'
    ];
    
    // Check for non-food keywords first
    if (nonFoodKeywords.some(keyword => name.includes(keyword))) {
      return false;
    }
    
    // Check for food keywords
    if (foodKeywords.some(keyword => name.includes(keyword))) {
      return true;
    }
    
    // Additional heuristics for unknown items
    // Reasonable length (not too short or too long)
    if (name.length < 3 || name.length > 25) return false;
    
    // Has enough vowels
    const vowelCount = (name.match(/[aeiouy]/g) || []).length;
    if (vowelCount < 2) return false;
    
    // Mostly alphabetic
    const alphaRatio = (name.match(/[a-zA-Z]/g) || []).length / name.length;
    if (alphaRatio < 0.7) return false;
    
    return true; // Default to including if it passes basic checks
  }
}

// ============= SMART PARSER =============
export interface ParsedReceiptLine {
  itemName: string;
  quantity: string;
  price: string;
  weight?: string;
  isVerifiedFood: boolean;
}

export class SmartParser {
  
  static parseAnyLine(line: string): ParsedReceiptLine | null {
    // Smart parser that tries to extract meaningful food items while filtering OCR noise
    const originalLine = line.trim();
    
    // Skip obviously bad lines - much stricter
    if (originalLine.length < 6) return null;
    if (/^[\d\s\-\*\=\.]+$/.test(originalLine)) return null;
    
    // Skip lines with excessive special characters or OCR artifacts
    const specialCharCount = (originalLine.match(/[^a-zA-Z0-9\s]/g) || []).length;
    if (specialCharCount > originalLine.length * 0.4) return null;
    
    // Skip lines that are clearly OCR garbage or store operations
    if (/employee|discount|senior|wessel|enployel|bpddbbiannnatiIl|torpc|saved|pub|ben|poy|ere|rg|eba|aten|aal|ene|hase|saat|stn|bias|ett|laid|selhad|alr|rest\s+style|diy|band|street|fo|lrarlotfesville|gri|ofen|ial|cochiang|jrean|cerrot|daily|hours|virginia|va\s+\d/i.test(originalLine)) return null;
    
    // Skip lines that look like OCR garbage (too many single letters)
    const words = originalLine.split(/\s+/);
    const singleLetterWords = words.filter(word => word.length === 1).length;
    if (singleLetterWords > words.length * 0.3) return null;
    
    let itemName = '';
    let quantity = '1';
    let isVerifiedFood = false;
    
    // Extract quantity from patterns like "2 @ 0.37" or "3 for $1.00"
    const quantityAtPriceMatch = originalLine.match(/(\d+)\s*[@x]\s*[\$]?\d+\.?\d*/i);
    if (quantityAtPriceMatch) {
      quantity = quantityAtPriceMatch[1];
      itemName = originalLine.replace(/\d+\s*[@x]\s*[\$]?\d+\.?\d*/i, '').trim();
      isVerifiedFood = true;
    } else {
      // Look for explicit quantity mentions
      const qtyMatch = originalLine.match(/qty[\s:]*(\d+)/i) || originalLine.match(/(\d+)\s*qty/i);
      if (qtyMatch) {
        quantity = qtyMatch[1];
        itemName = originalLine.replace(/qty[\s:]*\d+/i, '').replace(/\d+\s*qty/i, '').trim();
      } else {
        // Remove all prices, weights, and numeric patterns except quantity
        itemName = originalLine
          .replace(/\$\d+\.?\d*/g, '') // Remove prices with $
          .replace(/\d+\.?\d*\s*lb/gi, '') // Remove weight measurements
          .replace(/\b\d+\.?\d{2}\b/g, '') // Remove decimal numbers (prices)
          .replace(/\b[A-Z]\s*$/g, '') // Remove single letters at end (flags like F, N, T)
          .replace(/\b(PC|WT|SC|F|N|T|A)\b/gi, '') // Remove abbreviations
          .replace(/\b\d{3,}\b/g, '') // Remove long numeric codes
          .replace(/[@x]\s*\d+/gi, '') // Remove @ patterns
          .trim();
      }
    }
    
    // Look for food indicators
    const foodIndicators = ['F', 'N', 'T', 'A'];
    if (foodIndicators.some(flag => originalLine.includes(` ${flag} `) || originalLine.endsWith(` ${flag}`))) {
      isVerifiedFood = true;
    }
    
    // Look for weight indicators (usually food)
    if (/\d+\.?\d*\s*lb/i.test(originalLine)) {
      isVerifiedFood = true;
    }
    
    // Look for PLU codes (4-5 digits, usually produce)  
    if (/^\d{4,5}/.test(originalLine)) {
      isVerifiedFood = true;
    }
    
    // Clean up the item name
    itemName = this.cleanSmartName(itemName);
    
    if (itemName.length < 3) return null;
    
    return {
      itemName,
      quantity,
      price: '0.00', // Ignore prices as requested
      isVerifiedFood
    };
  }
  
  private static cleanSmartName(name: string): string {
    return name
      .replace(/\b(KRO|KROGER|WALMART|WM|TARGET|TGT|SAFEWAY|SWY|ALDI)\b/gi, '') // Remove store names
      .replace(/\b(ORGANIC|FRESH|FROZEN|CANNED|NATURAL|PREMIUM|SELECT|GREAT VALUE|GV|PC|SS)\b/gi, '') // Remove adjectives  
      .replace(/\b(EACH|EA|PKG|PACKAGE|BAG|BOX|BOTTLE|CAN|JAR|CT|COUNT|LB|LBS|OZ|WT|SC)\b/gi, '') // Remove packaging
      .replace(/\b\d+\b/g, '') // Remove ALL standalone numbers
      .replace(/\d+/g, '') // Remove any remaining numbers
      .replace(/[^\w\s]/g, ' ') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      // Fix common OCR errors to make names more readable
      .replace(/\bmawt\b/gi, 'malt') // Common OCR error
      .replace(/\bbc\b/gi, '') // Remove random letters
      .replace(/\bb\b/gi, '') // Remove single letters
      .replace(/\bo\b/gi, '') // Remove single letters
      .replace(/\boo\b/gi, '') // Remove OCR artifacts
      .replace(/\s+/g, ' ') // Normalize whitespace again
      .trim();
  }
}

// ============= MAIN OCR SERVICE =============
export interface ScanResult {
  items: FoodItem[];
  originalText: string;
  confidence: number;
}

export class ReceiptScanner {
  private worker: any = null;
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
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const items: FoodItem[] = [];
    
    for (const line of lines) {
      // Skip lines that are obviously not food items
      if (ReceiptFilters.isNonFoodLine(line)) {
        continue;
      }
      
      // Try the smart parser to extract potential items
      const parsed = SmartParser.parseAnyLine(line);
      if (!parsed) continue;
      
      // Additional validation
      if (!ReceiptFilters.isValidItemName(parsed.itemName)) {
        continue;
      }
      
      // Skip if likely OCR misread
      if (OCRCorrection.isLikelyMisread(parsed.itemName)) {
        continue;
      }
      
      // Apply OCR corrections
      const correctedName = OCRCorrection.correctItemName(parsed.itemName);
      
      // Get food data and calculate freshness - STRICT VALIDATION
      const foodData = findFoodItem(correctedName);
      
      // REQUIRE food to be in our database - no exceptions for unclear OCR
      if (!foodData) {
        console.log(`Skipping item not in food database: "${correctedName}"`);
        continue;
      }
      
      // Additional strict validation - ensure it's a real food word
      const realFoodWords = ['apple', 'banana', 'orange', 'milk', 'bread', 'cheese', 'chicken', 'beef', 'potato', 
        'carrot', 'tomato', 'onion', 'lettuce', 'spinach', 'broccoli', 'egg', 'butter', 'yogurt', 'rice', 'pasta',
        'fish', 'salmon', 'tuna', 'ham', 'bacon', 'corn', 'peas', 'beans', 'cucumber', 'pepper', 'mushroom',
        'lemon', 'lime', 'strawberry', 'blueberry', 'grape', 'melon', 'peach', 'pear', 'cherry', 'avocado'];
      
      const hasRealFoodWord = realFoodWords.some(word => correctedName.toLowerCase().includes(word));
      if (!hasRealFoodWord) {
        console.log(`Skipping item without recognizable food words: "${correctedName}"`);
        continue;
      }
      
      const shelfLife = foodData?.shelfLife || 7; // Default 7 days
      const category = foodData?.category || 'Other';
      
      const purchaseDate = new Date();
      const expirationDate = new Date();
      expirationDate.setDate(purchaseDate.getDate() + shelfLife);
      
      // Calculate freshness based on shelf life
      const daysUntilExpiration = Math.ceil((expirationDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
      let freshness: 'fresh' | 'warning' | 'expired';
      
      if (daysUntilExpiration <= 0) {
        freshness = 'expired';
      } else if (daysUntilExpiration <= Math.ceil(shelfLife * 0.3)) {
        freshness = 'warning';
      } else {
        freshness = 'fresh';
      }
      
      const foodItem: FoodItem = {
        id: Math.random().toString(36).substr(2, 9),
        name: correctedName,
        quantity: parsed.quantity,
        purchaseDate,
        expirationDate,
        freshness,
        category,
        confidence: parsed.isVerifiedFood ? 0.9 : 0.7
      };

      items.push(foodItem);
    }

    // Always require at least one valid food item from our database
    if (items.length === 0) {
      throw new Error('No recognizable food items found in receipt. Please ensure the image shows a grocery receipt with clear food item names.');
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