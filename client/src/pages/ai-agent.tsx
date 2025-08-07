import { useState } from "react";
import { Bot, Send, User, Sparkles, ChefHat, Clock, Users, Bookmark, BookmarkCheck } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ReasoningStep {
  step: string;
  reasoning: string;
  action?: string;
  result?: string;
}

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  reasoning?: ReasoningStep[];
  suggestions?: string[];
}

interface GeneratedRecipe {
  title: string;
  ingredients: string[];
  instructions: string[];
  cookTime?: string;
  servings?: number;
  missing_ingredients?: string[];
  source?: string;
}

interface RecipeGeneration {
  recipes: GeneratedRecipe[];
}

export default function AIAgent() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: "Hello! I'm your enhanced AI kitchen assistant with advanced reasoning capabilities. I can analyze your ingredients, learn your preferences, create personalized recipes, and provide intelligent cooking advice. I'll show you my thought process so you can see how I make decisions. Try asking me to generate recipes with your fridge ingredients or ask any cooking question!",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [generatedRecipes, setGeneratedRecipes] = useState<GeneratedRecipe[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<Set<string>>(new Set());
  const [showReasoning, setShowReasoning] = useState<{ [key: string]: boolean }>({});
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Save recipe mutation
  const saveRecipeMutation = useMutation({
    mutationFn: async (recipe: GeneratedRecipe) => {
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: recipe.title,
          description: `AI-generated recipe with ${recipe.ingredients.length} ingredients`,
          cookTime: recipe.cookTime || '30 mins',
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          servings: recipe.servings || 4,
          isAiGenerated: true,
          isSaved: true,
          difficulty: 'Medium',
          cuisineType: 'General'
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save recipe');
      }
      
      return response.json();
    },
    onSuccess: (_, recipe) => {
      setSavedRecipes(prev => new Set([...Array.from(prev), recipe.title]));
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      toast({
        title: "Recipe Saved!",
        description: `"${recipe.title}" has been added to your recipes`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save recipe",
        variant: "destructive",
      });
    }
  });

  const recipeGenerationMutation = useMutation({
    mutationFn: async (data: { num_people: number; ingredients: string; dietary?: string; useFridgeIngredients?: boolean }): Promise<RecipeGeneration> => {
      // Get fridge ingredients if requested
      let fridgeIngredients: string[] = [];
      if (data.useFridgeIngredients) {
        try {
          const fridgeResponse = await fetch('/api/food-items');
          if (fridgeResponse.ok) {
            const fridgeItems = await fridgeResponse.json();
            fridgeIngredients = fridgeItems.map((item: any) => item.name);
          }
        } catch (error) {
          console.error('Failed to fetch fridge ingredients:', error);
        }
      }
      
      const response = await fetch('/api/generate-recipes', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          fridgeIngredients: fridgeIngredients.length > 0 ? fridgeIngredients : undefined
        }),
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate recipes');
      }
      
      return response.json();
    },
    onSuccess: (data: RecipeGeneration) => {
      setGeneratedRecipes(data.recipes);
      const recipeMessage: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: `I've generated ${data.recipes.length} delicious recipes for you! Check them out below. You can save any recipe to your collection by clicking the bookmark icon.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, recipeMessage]);
      setIsTyping(false);
    },
    onError: (error) => {
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: "Sorry, I had trouble generating recipes. Please try again with your ingredients list.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsTyping(false);
    }
  });

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage("");
    setIsTyping(true);

    try {
      // Use enhanced AI agent
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: currentInput,
          userId: 'user-1' // In production, use actual user ID
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const aiData = await response.json();
      
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiData.final_answer || 'No response content',
        timestamp: new Date(),
        reasoning: aiData.thought_process || [],
        suggestions: aiData.suggestions || []
      };

      setMessages(prev => [...prev, aiResponse]);
      
      // If recipes were generated, update the recipes state
      if (aiData.recipes && aiData.recipes.length > 0) {
        setGeneratedRecipes(aiData.recipes);
      }
      
    } catch (error) {
      console.error('AI chat error:', error);
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: "I apologize, but I encountered an issue processing your request. Could you please try again?",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const isRecipeGenerationRequest = (input: string): boolean => {
    const lowerInput = input.toLowerCase();
    return lowerInput.includes('generate recipe') || 
           lowerInput.includes('make recipe') || 
           lowerInput.includes('create recipe') ||
           (lowerInput.includes('recipe') && (lowerInput.includes('ingredients') || lowerInput.includes('with')));
  };

  const parseRecipeRequest = (input: string): { num_people: number; ingredients: string; dietary?: string } | null => {
    try {
      // Extract number of people (default to 1)
      const peopleMatch = input.match(/(\d+)\s*(people|person|servings?)/i);
      const num_people = peopleMatch ? parseInt(peopleMatch[1]) : 1;

      // Extract ingredients - look for patterns like "with chicken, rice" or "using chicken, rice"
      const ingredientsMatch = input.match(/(?:with|using|ingredients?:?)\s*([^.!?]+)/i);
      if (!ingredientsMatch) {
        return null;
      }
      const ingredients = ingredientsMatch[1].trim();

      // Extract dietary restrictions
      const dietaryMatch = input.match(/(?:gluten.free|vegetarian|vegan|dairy.free|keto|paleo)/i);
      const dietary = dietaryMatch ? dietaryMatch[0] : undefined;

      return { num_people, ingredients, dietary };
    } catch (error) {
      return null;
    }
  };

  const getAIResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();
    
    if (input.includes('recipe') || input.includes('cook')) {
      return "I'd be happy to help with recipes! Try saying 'Generate recipes with my fridge ingredients' to use what you have, or 'Create recipe with chicken and rice for 2 people' for specific ingredients.";
    } else if (input.includes('fridge') || input.includes('what i have')) {
      return "I can create recipes using ingredients in your fridge! Just say 'Generate recipes with my fridge ingredients' and I'll make delicious suggestions based on what you currently have.";
    } else if (input.includes('storage') || input.includes('store')) {
      return "Great question about food storage! Proper storage can significantly extend the life of your ingredients. What specific items would you like storage tips for?";
    } else if (input.includes('expir') || input.includes('fresh')) {
      return "I can help you manage expiration dates! I recommend using items that expire soonest first. Would you like me to prioritize your current inventory?";
    } else if (input.includes('meal plan')) {
      return "Meal planning is a great way to reduce waste and save time! I can create a personalized meal plan based on your ingredients and dietary preferences. What are your goals?";
    } else {
      return "That's an interesting question! I'm here to help with all your kitchen and food-related needs. Try 'Generate recipes with my fridge ingredients' to use what you have, or ask about storage tips, meal planning, or anything food-related!";
    }
  };

  return (
    <div className="flex flex-col h-screen" style={{backgroundColor: 'hsl(45, 20%, 97%)'}}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex items-start space-x-3 max-w-[80%] ${
              message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
            }`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                message.type === 'user' 
                  ? 'bg-apple-green' 
                  : 'bg-[#1e3a2e]'
              }`}>
                {message.type === 'user' ? (
                  <User className="text-white" size={20} />
                ) : (
                  <Bot className="text-white" size={20} />
                )}
              </div>
              <div className={`rounded-2xl p-4 ${
                message.type === 'user'
                  ? 'bg-apple-green text-white'
                  : 'bg-[#1e3a2e] text-white border border-[#2d5a3a]'
              }`}>
                <p className="text-sm">{message.content}</p>
                
                {/* AI Reasoning Process */}
                {message.type === 'ai' && message.reasoning && message.reasoning.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-green-600/30">
                    <button
                      onClick={() => setShowReasoning(prev => ({
                        ...prev,
                        [message.id]: !prev[message.id]
                      }))}
                      className="flex items-center space-x-2 text-xs text-green-300 hover:text-green-200 transition-colors"
                    >
                      <span>💭</span>
                      <span>{showReasoning[message.id] ? 'Hide' : 'Show'} AI Reasoning Process</span>
                    </button>
                    
                    {showReasoning[message.id] && (
                      <div className="mt-2 space-y-2">
                        {message.reasoning.map((step, index) => (
                          <div key={index} className="bg-green-900/30 rounded-lg p-3 text-xs">
                            <div className="font-semibold text-green-300 mb-1">
                              Step {index + 1}: {step.step}
                            </div>
                            <div className="text-green-100 mb-1">
                              💡 <strong>Reasoning:</strong> {step.reasoning}
                            </div>
                            {step.action && (
                              <div className="text-green-200">
                                🎯 <strong>Action:</strong> {step.action}
                              </div>
                            )}
                            {step.result && (
                              <div className="text-green-200 mt-1">
                                ✅ <strong>Result:</strong> {step.result}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {/* AI Suggestions */}
                {message.type === 'ai' && message.suggestions && message.suggestions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-green-600/30">
                    <div className="text-xs text-green-300 mb-2">💡 Smart Suggestions:</div>
                    <div className="space-y-1">
                      {message.suggestions.map((suggestion, index) => (
                        <div key={index} className="text-xs text-green-200 flex items-start">
                          <span className="text-green-400 mr-2 mt-0.5">•</span>
                          <span>{suggestion}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <p className={`text-xs mt-2 ${
                  message.type === 'user' ? 'text-white/70' : 'text-gray-400'
                }`}>
                  {message.timestamp.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-3 max-w-[80%]">
              <div className="w-10 h-10 rounded-full bg-[#1e3a2e] flex items-center justify-center">
                <Bot className="text-white" size={20} />
              </div>
              <div className="bg-[#1e3a2e] text-white border border-[#2d5a3a] rounded-2xl p-4">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                  <span className="text-xs text-green-300">AI is thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Generated Recipes Display */}
        {generatedRecipes.length > 0 && (
          <div className="space-y-4 mt-4">
            {generatedRecipes.map((recipe, index) => (
              <div key={index} className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                      <ChefHat className="text-white" size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 mb-1" style={{fontFamily: 'Times New Roman, serif'}}>{recipe.title}</h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        {recipe.cookTime && (
                          <div className="flex items-center space-x-1">
                            <Clock size={14} />
                            <span>{recipe.cookTime}</span>
                          </div>
                        )}
                        {recipe.servings && (
                          <div className="flex items-center space-x-1">
                            <Users size={14} />
                            <span>{recipe.servings} servings</span>
                          </div>
                        )}
                        {recipe.source && (
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-500" style={{fontFamily: 'Times New Roman, serif'}}>
                            Enhanced with online recipes
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => saveRecipeMutation.mutate(recipe)}
                    disabled={savedRecipes.has(recipe.title) || saveRecipeMutation.isPending}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
                  >
                    {savedRecipes.has(recipe.title) ? (
                      <BookmarkCheck className="text-green-600" size={20} />
                    ) : (
                      <Bookmark className="text-gray-600" size={20} />
                    )}
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2" style={{fontFamily: 'Times New Roman, serif'}}>Ingredients:</h4>
                    <ul className="space-y-1">
                      {recipe.ingredients.map((ingredient, i) => (
                        <li key={i} className="text-sm text-gray-600 flex items-start">
                          <span className="text-orange-500 mr-2">•</span>
                          {ingredient}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {recipe.missing_ingredients && recipe.missing_ingredients.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-red-600 mb-2" style={{fontFamily: 'Times New Roman, serif'}}>
                        Missing Ingredients:
                      </h4>
                      <ul className="space-y-1">
                        {recipe.missing_ingredients.map((ingredient, i) => (
                          <li key={i} className="text-sm text-red-600 flex items-start">
                            <span className="text-red-500 mr-2">⚠</span>
                            {ingredient}
                          </li>
                        ))}
                      </ul>
                      <p className="text-xs text-gray-500 mt-2" style={{fontFamily: 'Times New Roman, serif'}}>
                        These ingredients are needed but not in your current fridge inventory
                      </p>
                    </div>
                  )}

                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2" style={{fontFamily: 'Times New Roman, serif'}}>Instructions:</h4>
                    <ol className="space-y-2">
                      {recipe.instructions.map((instruction, i) => (
                        <li key={i} className="text-sm text-gray-600 flex items-start">
                          <span className="font-medium text-orange-500 mr-2 min-w-[1.5rem]">{i + 1}.</span>
                          {instruction}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-[#1e3a2e] border-t border-[#2d5a3a]">
        <div className="flex items-center space-x-3">
          <div className="flex-1 bg-white rounded-2xl border border-green-200">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask me anything about cooking, recipes, or food..."
              className="w-full bg-transparent text-black placeholder-gray-500 p-4 rounded-2xl outline-none"
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isTyping}
            className="w-12 h-12 bg-apple-green rounded-2xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-600 transition-all"
          >
            <Send className="text-white" size={20} />
          </button>
        </div>
      </div>

        {/* Quick Actions */}
        <div className="p-4 pb-4" style={{backgroundColor: 'hsl(45, 20%, 97%)'}}>
          <div className="flex space-x-2 overflow-x-auto">
            {[
              "Generate recipes with my fridge ingredients",
              "Generate recipe with chicken, rice, broccoli",
              "Storage tips",
              "Meal planning help"
            ].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setInputMessage(suggestion)}
                className="flex-shrink-0 bg-[#1e3a2e] text-white px-4 py-2 rounded-full text-sm border border-[#2d5a3a] hover:bg-green-600 transition-colors"
              >
                <Sparkles className="inline mr-2" size={14} />
                {suggestion}
              </button>
            ))}
          </div>
        </div>
    </div>
  );
}