import { useState } from "react";
import { Bot, Send, User, Sparkles } from "lucide-react";

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

export default function AIAgent() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: "Hello! I'm your AI kitchen assistant. I can help you with recipes, meal planning, food storage tips, and more. What would you like to know?",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: getAIResponse(inputMessage),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500);
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
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="bg-blue-600 p-6 text-white">
        <div className="flex items-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mr-4">
            <Bot className="text-white" size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold mb-1">AI Kitchen Assistant</h1>
            <p className="text-white/90">Your smart cooking companion</p>
          </div>
        </div>
      </div>

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
      <div className="p-4 bg-gray-900 pb-24">
        <div className="flex space-x-2 overflow-x-auto">
          {[
            "Suggest a recipe",
            "Storage tips",
            "Meal planning help",
            "Ingredient substitutes"
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