import * as cheerio from 'cheerio';
import fetch from 'node-fetch';

export interface RecipeSource {
  title: string;
  ingredients: string[];
  instructions: string[];
  source: string;
}

export class RecipeScraper {
  private sources = [
    'https://www.allrecipes.com',
    'https://www.foodnetwork.com',
    'https://www.taste.com.au',
    'https://www.delish.com'
  ];

  async searchRecipes(query: string): Promise<RecipeSource[]> {
    const recipes: RecipeSource[] = [];
    
    // Search multiple recipe websites
    for (const source of this.sources.slice(0, 2)) { // Limit to 2 sources for performance
      try {
        const sourceRecipes = await this.scrapeRecipeSource(source, query);
        recipes.push(...sourceRecipes);
      } catch (error) {
        console.log(`Failed to scrape ${source}:`, error instanceof Error ? error.message : 'Unknown error');
        // Continue with other sources
      }
    }

    return recipes.slice(0, 10); // Return top 10 recipes
  }

  private async scrapeRecipeSource(baseUrl: string, query: string): Promise<RecipeSource[]> {
    const recipes: RecipeSource[] = [];
    
    try {
      // Create search URL
      const searchUrl = `${baseUrl}/search/results/?search=${encodeURIComponent(query)}`;
      
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      
      // Extract recipe data based on common patterns
      const recipeElements = $('article, .recipe-card, .card-recipe, .recipe-item').slice(0, 3);
      
      recipeElements.each((i, element) => {
        const $element = $(element);
        
        const title = $element.find('h1, h2, h3, .recipe-title, .card-title, .entry-title').first().text().trim();
        
        if (title && title.length > 5) {
          // Extract ingredients (common selectors)
          const ingredients: string[] = [];
          $element.find('.recipe-ingredients li, .ingredients li, .ingredient, [class*="ingredient"]').each((j, ing) => {
            const text = $(ing).text().trim();
            if (text && text.length > 2) {
              ingredients.push(text);
            }
          });

          // Extract instructions (common selectors)
          const instructions: string[] = [];
          $element.find('.recipe-instructions li, .instructions li, .method li, .directions li, [class*="instruction"]').each((j, inst) => {
            const text = $(inst).text().trim();
            if (text && text.length > 10) {
              instructions.push(text);
            }
          });

          if (ingredients.length > 0 || instructions.length > 0) {
            recipes.push({
              title,
              ingredients,
              instructions,
              source: baseUrl
            });
          }
        }
      });
    } catch (error) {
      // Return empty array if scraping fails
      console.log(`Scraping failed for ${baseUrl}:`, error instanceof Error ? error.message : 'Unknown error');
    }
    
    return recipes;
  }

  // Fallback method using structured recipe knowledge
  generateStructuredRecipes(ingredients: string[], dietary: string = '', numPeople: number = 2): RecipeSource[] {
    const commonRecipes = [
      {
        title: "Quick Stir Fry",
        ingredients: ["2 cups mixed vegetables", "2 tbsp oil", "2 cloves garlic", "1 tbsp soy sauce", "1 tsp ginger"],
        instructions: [
          "Heat oil in a large pan or wok over high heat",
          "Add garlic and ginger, stir for 30 seconds",
          "Add vegetables and stir-fry for 3-4 minutes",
          "Add soy sauce and toss to combine",
          "Serve immediately over rice"
        ],
        source: "Traditional Recipe"
      },
      {
        title: "Simple Pasta",
        ingredients: ["200g pasta", "2 tbsp olive oil", "2 cloves garlic", "1/4 cup parmesan", "Salt and pepper"],
        instructions: [
          "Cook pasta according to package directions",
          "Heat olive oil in a pan, add minced garlic",
          "Drain pasta, reserving 1/2 cup pasta water",
          "Toss pasta with garlic oil and pasta water",
          "Add parmesan, salt, and pepper to taste"
        ],
        source: "Traditional Recipe"
      },
      {
        title: "Fresh Salad Bowl",
        ingredients: ["4 cups mixed greens", "1 cup cherry tomatoes", "1/2 cucumber", "2 tbsp olive oil", "1 tbsp vinegar"],
        instructions: [
          "Wash and dry the mixed greens thoroughly",
          "Cut cherry tomatoes in half",
          "Slice cucumber into thin rounds",
          "Combine all vegetables in a large bowl",
          "Whisk olive oil and vinegar, pour over salad and toss"
        ],
        source: "Traditional Recipe"
      }
    ];

    // Filter recipes based on available ingredients
    return commonRecipes.filter(recipe => {
      const recipeIngredients = recipe.ingredients.join(' ').toLowerCase();
      return ingredients.some(ing => recipeIngredients.includes(ing.toLowerCase()));
    }).slice(0, 2);
  }
}