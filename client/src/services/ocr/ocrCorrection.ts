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