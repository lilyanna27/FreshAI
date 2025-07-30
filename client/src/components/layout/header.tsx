export default function Header() {
  const getUserInitials = () => {
    return "JD"; // Default user initials - in a real app, this would come from user context/state
  };

  return (
    <header className="bg-gray-900 sticky top-0 z-50">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1">
            <div className="w-1 h-1 bg-white rounded-full"></div>
            <div className="w-1 h-1 bg-white rounded-full"></div>
            <div className="w-1 h-1 bg-white rounded-full"></div>
          </div>
          <div className="w-6 h-3 bg-white rounded-sm"></div>
          <div className="w-4 h-2 bg-white rounded-sm"></div>
        </div>
        
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-apple-green to-emerald-400 bg-clip-text text-transparent tracking-tight">
            FreshAI
          </h1>
          <div className="w-8 h-8 bg-gradient-to-br from-apple-green to-emerald-500 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold text-sm">{getUserInitials()}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
