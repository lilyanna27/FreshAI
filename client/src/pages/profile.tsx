import { User, Settings, Bell, HelpCircle, LogOut, ChevronRight } from "lucide-react";

export default function Profile() {
  const profileItems = [
    { icon: Settings, label: "Account Settings", href: "/settings" },
    { icon: Bell, label: "Notifications", href: "/notifications" },
    { icon: HelpCircle, label: "Help & Support", href: "/help" },
  ];

  return (
    <div className="pb-24" style={{backgroundColor: 'hsl(45, 20%, 97%)'}}>
      {/* Header */}
      <div className="px-6 py-4" style={{backgroundColor: '#1e3a2e'}}>
        <div className="text-center">
          <h1 className="text-white text-xl font-bold" style={{fontFamily: 'Times New Roman, serif'}}>FreshAI</h1>
        </div>
      </div>

      <div className="px-6 pt-8">
        {/* Profile Header */}
      <div className="bg-gray-800 rounded-3xl p-6 mb-6 border border-gray-700">
        <div className="flex items-center mb-4">
          <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mr-4">
            <User className="w-10 h-10 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-1">John Doe</h2>
            <p className="text-gray-400 text-sm">john.doe@example.com</p>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-700">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">24</p>
            <p className="text-xs text-gray-400">Items Saved</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">12</p>
            <p className="text-xs text-gray-400">Recipes Made</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">5.2kg</p>
            <p className="text-xs text-gray-400">Waste Reduced</p>
          </div>
        </div>
      </div>

      {/* Sustainability Impact */}
      <div className="bg-emerald-600 rounded-3xl p-6 mb-6">
        <div className="flex items-center mb-3">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mr-3">
            <span className="text-white text-xl">🌱</span>
          </div>
          <div>
            <h3 className="text-white font-semibold">Sustainability Impact</h3>
            <p className="text-white/80 text-sm">This month</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-white/80 text-xs mb-1">Money Saved</p>
            <p className="text-white text-lg font-bold">$32.50</p>
          </div>
          <div>
            <p className="text-white/80 text-xs mb-1">CO2 Reduced</p>
            <p className="text-white text-lg font-bold">2.1kg</p>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="space-y-3 mb-6">
        {profileItems.map(({ icon: Icon, label, href }) => (
          <div key={label} className="bg-gray-800 rounded-2xl border border-gray-700">
            <button className="w-full p-4 flex items-center justify-between hover:bg-gray-700 transition-colors rounded-2xl">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gray-700 rounded-xl flex items-center justify-center mr-3">
                  <Icon className="w-5 h-5 text-gray-300" />
                </div>
                <span className="text-white font-medium">{label}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        ))}
      </div>

      {/* Logout Button */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700">
        <button className="w-full p-4 flex items-center hover:bg-gray-700 transition-colors rounded-2xl">
          <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center mr-3">
            <LogOut className="w-5 h-5 text-red-400" />
          </div>
          <span className="text-red-400 font-medium">Sign Out</span>
        </button>
      </div>
      </div>
    </div>
  );
}