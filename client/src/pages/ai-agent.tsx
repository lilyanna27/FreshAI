import { useState } from "react";
import { Bot, Send, User, Sparkles, ChefHat, Clock, Users } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface GeneratedRecipe {
  title: string;
  ingredients: string[];
  instructions: string[];
  cookTime?: string;
  servings?: number;
}

interface RecipeGeneration extends Array<GeneratedRecipe> {}

export default function AIAgent() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: "Hello! I'm your AI kitchen assistant. I can help you with recipes, meal planning, food storage tips, and more. Try asking me to generate recipes with your available ingredients!",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [generatedRecipes, setGeneratedRecipes] = useState<GeneratedRecipe[]>([]);

  const recipeGenerationMutation = useMutation({
    mutationFn: async (data: { num_people: number; ingredients: string; dietary?: string }): Promise<RecipeGeneration> => {
      const response = await fetch('/api/generate-recipes', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate recipes');
      }
      
      return response.json();
    },
    onSuccess: (data: RecipeGeneration) => {
      setGeneratedRecipes(data);
      const recipeMessage: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: `I've generated ${data.length} delicious recipes for you! Check them out below.`,
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

    // Check if the message is requesting recipe generation
    if (isRecipeGenerationRequest(currentInput)) {
      const recipeParams = parseRecipeRequest(currentInput);
      if (recipeParams) {
        recipeGenerationMutation.mutate(recipeParams);
        return;
      }
    }

    // Simulate AI response for other queries
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: getAIResponse(currentInput),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500);
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
      const dietary = dietaryMatch ? dietaryMatch[0] : "none";

      return { num_people, ingredients, dietary };
    } catch (error) {
      return null;
    }
  };

  const getAIResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();
    
    if (input.includes('recipe') || input.includes('cook')) {
      return "I'd be happy to help with recipes! Based on your current ingredients, I can suggest some great meal ideas. What type of cuisine are you in the mood for?";
    } else if (input.includes('storage') || input.includes('store')) {
      return "Great question about food storage! Proper storage can significantly extend the life of your ingredients. What specific items would you like storage tips for?";
    } else if (input.includes('expir') || input.includes('fresh')) {
      return "I can help you manage expiration dates! I recommend using items that expire soonest first. Would you like me to prioritize your current inventory?";
    } else if (input.includes('meal plan')) {
      return "Meal planning is a great way to reduce waste and save time! I can create a personalized meal plan based on your ingredients and dietary preferences. What are your goals?";
    } else {
      return "That's an interesting question! I'm here to help with all your kitchen and food-related needs. Feel free to ask about recipes, storage tips, meal planning, or anything food-related!";
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
                  : 'bg-gradient-to-br from-purple-500 to-blue-500'
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
                  : 'bg-gray-800 text-white border border-gray-700'
              }`}>
                <p className="text-sm">{message.content}</p>
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
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <Bot className="text-white" size={20} />
              </div>
              <div className="bg-gray-800 text-white border border-gray-700 rounded-2xl p-4">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                  <span className="text-xs text-gray-400">AI is thinking...</span>
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
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                    <ChefHat className="text-white" size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800" style={{fontFamily: 'Times New Roman, serif'}}>{recipe.title}</h3>
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
                    </div>
                  </div>
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
      <div className="p-4 bg-gray-900 border-t border-gray-800 pb-20">
        <div className="flex items-center space-x-3">
          <div className="flex-1 bg-gray-800 rounded-2xl border border-gray-700">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask me anything about cooking, recipes, or food..."
              className="w-full bg-transparent text-white placeholder-gray-400 p-4 rounded-2xl outline-none"
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isTyping}
            className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-600 hover:to-blue-600 transition-all"
          >
            <Send className="text-white" size={20} />
          </button>
        </div>
      </div>

        {/* Quick Actions */}
        <div className="p-4 pb-24" style={{backgroundColor: 'hsl(45, 20%, 97%)'}}>
          <div className="flex space-x-2 overflow-x-auto">
            {[
              "Generate recipe with chicken, rice, broccoli",
              "Storage tips",
              "Meal planning help",
              "Generate recipe with pasta for 2 people gluten-free"
            ].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setInputMessage(suggestion)}
                className="flex-shrink-0 bg-gray-800 text-gray-300 px-4 py-2 rounded-full text-sm border border-gray-700 hover:bg-gray-700 transition-colors"
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