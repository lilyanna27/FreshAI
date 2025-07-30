import { TrendingUp, DollarSign, Leaf, ChefHat } from "lucide-react";

export default function Sustainability() {
  // Mock sustainability data based on the FreshAI document requirements
  const currentMonth = {
    itemsSaved: 12,
    moneySaved: 45.50,
    wasteReduced: 2.3, // kg
    recipesGenerated: 8
  };

  const lastMonth = {
    itemsSaved: 8,
    moneySaved: 32.25,
    wasteReduced: 1.8,
    recipesGenerated: 5
  };

  const calculateChange = (current: number, previous: number) => {
    return Math.round(((current - previous) / previous) * 100);
  };

  const stats = [
    {
      label: "Items Saved",
      value: currentMonth.itemsSaved,
      change: calculateChange(currentMonth.itemsSaved, lastMonth.itemsSaved),
      icon: Leaf,
      color: "from-emerald-400 to-green-500",
      bgColor: "bg-emerald-500/20"
    },
    {
      label: "Money Saved",
      value: `$${currentMonth.moneySaved}`,
      change: calculateChange(currentMonth.moneySaved, lastMonth.moneySaved),
      icon: DollarSign,
      color: "from-green-400 to-emerald-500",
      bgColor: "bg-green-500/20"
    },
    {
      label: "Waste Reduced",
      value: `${currentMonth.wasteReduced} kg`,
      change: calculateChange(currentMonth.wasteReduced, lastMonth.wasteReduced),
      icon: TrendingUp,
      color: "from-blue-400 to-cyan-500",
      bgColor: "bg-blue-500/20"
    },
    {
      label: "Recipes Created",
      value: currentMonth.recipesGenerated,
      change: calculateChange(currentMonth.recipesGenerated, lastMonth.recipesGenerated),
      icon: ChefHat,
      color: "from-orange-400 to-red-500",
      bgColor: "bg-orange-500/20"
    }
  ];

  const environmentalImpact = {
    co2Saved: Math.round(currentMonth.wasteReduced * 2.5), // kg CO2
    waterSaved: Math.round(currentMonth.wasteReduced * 1000), // liters
    landfillDiverted: currentMonth.wasteReduced
  };

  return (
    <div className="p-4 pb-24">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Your Impact</h1>
        <p className="text-gray-400 text-sm">Track your sustainability progress this month</p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-gray-800 rounded-3xl p-5 border border-gray-700 relative overflow-hidden">
            <div className="relative z-10">
              <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-2xl flex items-center justify-center mb-3`}>
                <stat.icon className="text-white" size={20} />
              </div>
              <h3 className="text-white font-bold text-xl mb-1">{stat.value}</h3>
              <p className="text-gray-400 text-xs mb-2">{stat.label}</p>
              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                stat.change > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-700 text-gray-400'
              }`}>
                {stat.change > 0 ? '+' : ''}{stat.change}% vs last month
              </div>
            </div>
            <div className="absolute -top-4 -right-4 w-16 h-16 bg-white/5 rounded-full"></div>
          </div>
        ))}
      </div>

      {/* Environmental Impact */}
      <div className="bg-gradient-to-br from-green-600 to-emerald-600 rounded-3xl p-6 mb-6 relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="text-white font-bold text-lg mb-4">Environmental Impact</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-white text-2xl font-bold">{environmentalImpact.co2Saved}</p>
              <p className="text-white/80 text-xs">kg CO₂ saved</p>
            </div>
            <div className="text-center">
              <p className="text-white text-2xl font-bold">{environmentalImpact.waterSaved}</p>
              <p className="text-white/80 text-xs">L water saved</p>
            </div>
            <div className="text-center">
              <p className="text-white text-2xl font-bold">{environmentalImpact.landfillDiverted}</p>
              <p className="text-white/80 text-xs">kg from landfill</p>
            </div>
          </div>
        </div>
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full"></div>
        <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/10 rounded-full"></div>
      </div>

      {/* Monthly Progress */}
      <div className="bg-gray-800 rounded-3xl p-6 border border-gray-700 mb-6">
        <h3 className="text-white font-bold text-lg mb-4">This Month's Progress</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">Food Waste Reduction Goal</span>
              <span className="text-white">{Math.round((currentMonth.wasteReduced / 5) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-apple-green to-emerald-500 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min((currentMonth.wasteReduced / 5) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">Savings Goal ($50)</span>
              <span className="text-white">{Math.round((currentMonth.moneySaved / 50) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-green-400 to-emerald-500 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min((currentMonth.moneySaved / 50) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Tips for Better Impact */}
      <div className="bg-gray-800 rounded-3xl p-6 border border-gray-700">
        <h3 className="text-white font-bold text-lg mb-4">Sustainability Tips</h3>
        <div className="space-y-3">
          <div className="flex items-start">
            <div className="w-8 h-8 bg-apple-green rounded-full flex items-center justify-center mr-3 mt-0.5">
              <span className="text-white text-xs">🌱</span>
            </div>
            <div>
              <p className="text-white text-sm font-medium">Plan Your Meals</p>
              <p className="text-gray-400 text-xs">Use recipe suggestions for items expiring soon</p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
              <span className="text-white text-xs">📦</span>
            </div>
            <div>
              <p className="text-white text-sm font-medium">Proper Storage</p>
              <p className="text-gray-400 text-xs">Follow storage tips to extend food freshness</p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
              <span className="text-white text-xs">♻️</span>
            </div>
            <div>
              <p className="text-white text-sm font-medium">Compost Scraps</p>
              <p className="text-gray-400 text-xs">Turn unavoidable waste into nutrient-rich soil</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}