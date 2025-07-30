import { User } from "lucide-react";

export default function Header() {
  return (
    <header className="bg-gray-900 sticky top-0 z-50">
      <div className="flex items-center justify-between p-4">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          FreshAI
        </h1>
        
        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
          <User className="w-5 h-5 text-gray-600" />
        </div>
      </div>
    </header>
  );
}
