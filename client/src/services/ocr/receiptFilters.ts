export class ReceiptFilters {

  static hasPrice(line: string): boolean {
    // Much more flexible price detection to catch more items
    return /\$?\d+[\.\,]\d{1,2}/.test(line) || // Standard price format
           /\d+[\.\,]\d{1,2}\s*\$/.test(line) || // Price with $ at end
           /\d+\.\d{2}/.test(line) || // Just decimal number
           /\$\s*\d+/.test(line) || // $ followed by digits
           /\b\d{1,3}\.\d{2}\b/.test(line) || // Isolated price pattern
           /\d+\.\d{1,2}/.test(line) || // More flexible decimal
           /\$\d+/.test(line) || // Simple $number
           /\d+\s+\d{2}/.test(line) || // Price with space (OCR issue)
           /\b\d+\s*\.\s*\d{2}\b/.test(line) || // Space in decimal
           /\b\d+\s+\d{1,2}\b/.test(line) || // Numbers that might be prices
           /[A-Z]\s+\d+\.\d{2}/.test(line) || // Flag followed by price
           /[A-Z]\s+\$?\d+/.test(line) || // Flag followed by amount
           /\bF\b/.test(line) || // Kroger F flag (food indicator)
           /\bN\b/.test(line) || // Walmart N flag
           /\bT\b/.test(line) || // Target T flag
           /\bA\b/.test(line) || // Safeway A flag
           /\d+\s*lb\s*\d/.test(line); // Weight with numbers
  }

  static isNonFoodLine(line: string): boolean {
    const skipPatterns = [
      // Payment methods and card info
      /\b(visa|mastercard|discover|amex|american express|credit|debit|card|cash|check|gift card|ebt|snap)\b/i,
      /\b(chip read|contactless|mobile pay|apple pay|google pay|samsung pay)\b/i,
      /\b(payment|tender|change due|cash back)\b/i,

      // Receipt totals and taxes
      /\b(total|subtotal|tax|sales tax|deposit|bottle deposit|bag fee|environmental fee)\b/i,
      /\b(balance|amount due|amount paid|remaining balance)\b/i,

      // Store operations and metadata
      /\b(store|location|address|phone|tel|email|website|hours)\b/i,
      /\b(receipt|transaction|ref|reference|order|invoice)\b[\s#:]/i,
      /\b(cashier|associate|clerk|server|attendant|manager)\b/i,
      /\b(register|lane|terminal|pos)\b/i,

      // Dates, times, and numbers only
      /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/,
      /^\d{1,2}:\d{2}(:\d{2})?\s*(am|pm)?/i,
      /^[\d\s\-#*=.]+$/,
      /^\d{3,}\s*\d{3,}/,

      // Customer service and policies
      /\b(thank you|welcome|have a|visit us|return policy|satisfaction|guarantee)\b/i,
      /\b(customer|member|rewards|points|loyalty|savings)\b/i,
      /\b(survey|feedback|rate us|tell us)\b/i,

      // Promotions and discounts
      /\b(coupon|discount|sale|special|promotion|deal|offer|save)\b/i,
      /\b(raincheck|price match|ad match)\b/i,

      // Non-food household items
      /\b(toilet paper|tissue|paper towel|napkin|plate|cup|utensil)\b/i,
      /\b(soap|shampoo|conditioner|toothpaste|toothbrush|deodorant|lotion)\b/i,
      /\b(detergent|bleach|cleaner|disinfectant|spray|wipes)\b/i,
      /\b(battery|charger|cable|phone|electronic|device)\b/i,
      /\b(medicine|vitamin|supplement|bandage|first aid)\b/i,
      /\b(magazine|book|newspaper|card|gift)\b/i,
      /\b(clothing|shirt|pants|socks|underwear|shoes)\b/i,
      /\b(tool|hardware|automotive|oil|filter)\b/i,

      // OCR artifacts and gibberish
      /^[a-z]{1,3}\s+[a-z]{1,3}\s+[a-z]{1,3}$/i,
      /^.{0,2}$/,
      /^[a-z]{1,2}\s*\d+$/i,
      /^[A-Z]{2,}\s+[a-z]{1,3}\s+[A-Z]{2,}/,
      /[A-Z]{4,}[a-z]{1,2}[A-Z]{4,}/,

      // Employee and system codes
      /^(emp|employee|id|code|clerk|operator)\s*\d+/i,
      /^(lhec|wessel|dr|ald|alani|cosmic|plus customer|bal ance|purchase|ale|srg)/i,
      /^[\d\s]+lb$/i,
    ];

    return skipPatterns.some(pattern => pattern.test(line));
  }

  static isFoodItem(line: string): boolean {
    const foodPatterns = [
      // Common food words
      /\b(apple|banana|orange|grape|berry|fruit|vegetable|meat|chicken|beef|pork|fish|milk|cheese|bread|rice|pasta|egg|tomato|potato|onion|carrot|lettuce|spinach|broccoli)\b/i,
      // Organic/fresh indicators
      /\b(organic|fresh|natural|free range|grass fed)\b/i,
      // Food descriptors
      /\b(frozen|canned|dried|smoked|grilled|roasted)\b/i,
      // Weight/quantity indicators for food
      /\b\d+\s*(lb|oz|kg|g|count|pack|bunch|bag|box)\b/i,
    ];

    return foodPatterns.some(pattern => pattern.test(line));
  }

  static extractItemName(line: string): string {
    // Remove price information
    let cleaned = line.replace(/\$?\d+[\.\,]\d{1,2}/g, '');
    cleaned = cleaned.replace(/\d+[\.\,]\d{1,2}\s*\$/g, '');
    
    // Remove weight/quantity information
    cleaned = cleaned.replace(/\b\d+\s*(lb|oz|kg|g|count|pack|bunch|bag|box)\b/gi, '');
    
    // Remove common store codes and flags
    cleaned = cleaned.replace(/\b[A-Z]\b/g, '');
    
    // Remove extra whitespace and trim
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
  }
}