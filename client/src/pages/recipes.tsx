import { useQuery } from "@tanstack/react-query";
import { Recipe, FoodItem } from "@shared/schema";
import { Clock, BookOpen } from "lucide-react";

export default function Recipes() {
  const { data: recipes = [], isLoading: recipesLoading } = useQuery<Recipe[]>({
    queryKey: ["/api/recipes"],
  });

  const { data: foodItems = [] } = useQuery<FoodItem[]>({
    queryKey: ["/api/food-items"],
  });

  // Mock suggested recipes based on available ingredients
  const suggestedRecipes = [
    {
      id: "suggested-1",
      name: "Healthy Veggie Stir Fry",
      description: "Quick and nutritious meal using fresh vegetables",
      cookTime: "15 mins",
      imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200",
      availableIngredients: 5,
    },
    {
      id: "suggested-2", 
      name: "Herb Grilled Chicken",
      description: "Simple grilled chicken breast with fresh herbs",
      cookTime: "25 mins",
      imageUrl: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200",
      availableIngredients: 3,
    },
  ];

  const savedRecipes = [
    {
      id: "saved-1",
      name: "Creamy Pasta",
      cookTime: "30 mins",
      imageUrl: "https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=150",
    },
    {
      id: "saved-2",
      name: "Garden Salad", 
      cookTime: "10 mins",
      imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=150",
    },
  ];

  if (recipesLoading) {
    return (
      <div className="p-4">
        <div className="mb-6">
          <div className="bg-gray-700 animate-pulse rounded h-6 w-32 mb-2"></div>
          <div className="bg-gray-700 animate-pulse rounded h-4 w-48"></div>
        </div>
        <div className="space-y-4">
          {[1,2].map(i => (
            <div key={i} className="bg-gray-700 animate-pulse rounded-xl h-48"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 px-6 pt-8" style={{backgroundColor: 'hsl(45, 20%, 97%)'}}>
      {/* Recipe Content */}

      {/* Suggested Recipes */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-white mb-3">Suggested for You</h3>
        
        {suggestedRecipes.map((recipe) => (
          <div key={recipe.id} className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 mb-4 overflow-hidden">
            <img 
              src={recipe.imageUrl} 
              alt={recipe.name} 
              className="w-full h-32 object-cover"
            />
            <div className="p-4">
              <h4 className="font-semibold text-white mb-2">{recipe.name}</h4>
              <p className="text-sm text-gray-400 mb-3">{recipe.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center text-xs text-gray-400">
                  <Clock className="mr-1" size={12} />
                  <span>{recipe.cookTime}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-xs bg-apple-green/10 text-apple-green px-2 py-1 rounded-full mr-2">
                    {recipe.availableIngredients} ingredients available
                  </span>
                  <button className="text-apple-green text-sm font-medium hover:text-cal-poly-green">
                    View Recipe
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Saved Recipes */}
      <div>
        <h3 className="text-lg font-medium text-white mb-3">Saved Recipes</h3>
        {savedRecipes.length === 0 ? (
          <div className="bg-gray-800 rounded-xl p-8 shadow-sm border border-gray-700 text-center">
            <BookOpen className="mx-auto text-gray-500 mb-3" size={48} />
            <p className="text-gray-400">No saved recipes yet</p>
            <p className="text-sm text-gray-500 mt-2">Save recipes you love to access them quickly</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {savedRecipes.map((recipe) => (
              <div key={recipe.id} className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 overflow-hidden">
                <img 
                  src={recipe.imageUrl} 
                  alt={recipe.name} 
                  className="w-full h-20 object-cover"
                />
                <div className="p-3">
                  <h4 className="font-medium text-white text-sm mb-1">{recipe.name}</h4>
                  <p className="text-xs text-gray-400">{recipe.cookTime}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
