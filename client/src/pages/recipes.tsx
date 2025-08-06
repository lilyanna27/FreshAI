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

  // Filter AI-generated saved recipes
  const savedRecipes = recipes.filter(recipe => recipe.isSaved);

  if (recipesLoading) {
    return (
      <div className="pb-24" style={{backgroundColor: 'hsl(45, 20%, 97%)'}}>
        <div className="px-6 pt-8">
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
      </div>
    );
  }

  return (
    <div className="pb-24 px-6 pt-8" style={{backgroundColor: 'hsl(45, 20%, 97%)'}}>
      {/* Header */}
      <div className="text-center py-8 px-6 mb-8 rounded-3xl" style={{backgroundColor: '#1e3a2e'}}>
        <h1 className="text-2xl font-bold text-white mb-2" style={{fontFamily: 'Times New Roman, serif'}}>
          My Recipes
        </h1>
        <p className="text-white/80" style={{fontFamily: 'Times New Roman, serif'}}>
          Your saved recipe collection
        </p>
      </div>

      {/* Saved Recipes */}
      <div>
        {savedRecipes.length === 0 ? (
          <div className="rounded-3xl p-8 text-center" style={{backgroundColor: '#1e3a2e'}}>
            <BookOpen className="mx-auto text-white/50 mb-3" size={48} />
            <p className="text-white mb-2" style={{fontFamily: 'Times New Roman, serif'}}>No saved recipes yet</p>
            <p className="text-sm text-white/70" style={{fontFamily: 'Times New Roman, serif'}}>
              Generate recipes with the AI agent and save your favorites
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {savedRecipes.map((recipe) => (
              <div key={recipe.id} className="rounded-3xl p-6" style={{backgroundColor: '#1e3a2e'}}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2" style={{fontFamily: 'Times New Roman, serif'}}>
                      {recipe.name}
                    </h3>
                    <div className="flex items-center text-sm text-white/70">
                      <Clock size={16} className="mr-2" />
                      <span style={{fontFamily: 'Times New Roman, serif'}}>{recipe.cookTime}</span>
                      {recipe.servings && (
                        <>
                          <span className="mx-2">•</span>
                          <span style={{fontFamily: 'Times New Roman, serif'}}>{recipe.servings} servings</span>
                        </>
                      )}
                    </div>
                  </div>
                  {recipe.isAiGenerated && (
                    <span className="text-xs px-2 py-1 rounded-full bg-orange-500/20 text-orange-400" style={{fontFamily: 'Times New Roman, serif'}}>
                      AI Generated
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-white mb-2" style={{fontFamily: 'Times New Roman, serif'}}>
                      Ingredients ({recipe.ingredients.length})
                    </h4>
                    <div className="grid grid-cols-1 gap-1">
                      {recipe.ingredients.slice(0, 3).map((ingredient, i) => (
                        <p key={i} className="text-sm text-white/80" style={{fontFamily: 'Times New Roman, serif'}}>
                          • {ingredient}
                        </p>
                      ))}
                      {recipe.ingredients.length > 3 && (
                        <p className="text-sm text-white/60" style={{fontFamily: 'Times New Roman, serif'}}>
                          ... and {recipe.ingredients.length - 3} more
                        </p>
                      )}
                    </div>
                  </div>

                  {recipe.instructions && recipe.instructions.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-white mb-2" style={{fontFamily: 'Times New Roman, serif'}}>
                        Instructions ({recipe.instructions.length} steps)
                      </h4>
                      <p className="text-sm text-white/80" style={{fontFamily: 'Times New Roman, serif'}}>
                        1. {recipe.instructions[0]}
                        {recipe.instructions.length > 1 && (
                          <span className="text-white/60"> ... and {recipe.instructions.length - 1} more steps</span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
