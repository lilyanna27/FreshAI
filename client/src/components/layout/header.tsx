import { User } from "lucide-react";
import { Link } from "wouter";

export default function Header() {
  return (
    <header className="bg-gray-900 sticky top-0 z-50">
      <div className="flex items-center justify-between p-4">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          FreshAI
        </h1>
        
        <Link href="/profile">
          <button className="w-12 h-12 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors">
            <User className="w-7 h-7 text-gray-600" />
          </button>
        </Link>
      </div>
    </header>
  );
}
