import { getCurrentDateTime } from "@/lib/date-utils";

export default function Header() {
  const getUserInitials = () => {
    return "JD"; // Default user initials - in a real app, this would come from user context/state
  };

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="flex items-center justify-between p-4">
        <div>
          <h1 className="text-xl font-bold text-rose-ebony">Fresh AI</h1>
          <p className="text-sm text-gray-500">{getCurrentDateTime()}</p>
        </div>
        <div className="w-10 h-10 bg-apple-green rounded-full flex items-center justify-center cursor-pointer hover:bg-opacity-80 transition-colors">
          <span className="text-white font-semibold text-sm">{getUserInitials()}</span>
        </div>
      </div>
    </header>
  );
}
