import { getCurrentDateTime } from "@/lib/date-utils";

export default function Header() {
  const getUserInitials = () => {
    return "JD"; // Default user initials - in a real app, this would come from user context/state
  };

  return (
    <header className="bg-gray-900 sticky top-0 z-50">
      <div className="flex items-center justify-between p-4">
        <div className="text-gray-400 text-sm font-medium">
          {getCurrentDateTime()}
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1">
            <div className="w-1 h-1 bg-white rounded-full"></div>
            <div className="w-1 h-1 bg-white rounded-full"></div>
            <div className="w-1 h-1 bg-white rounded-full"></div>
          </div>
          <div className="w-6 h-3 bg-white rounded-sm"></div>
          <div className="w-6 h-3 bg-white rounded-sm"></div>
          <div className="w-4 h-2 bg-white rounded-sm"></div>
        </div>
      </div>
    </header>
  );
}
