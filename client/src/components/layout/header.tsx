import { User, ArrowLeft } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function Header() {
  const [location] = useLocation();
  const isHomePage = location === "/";
  
  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "/";
    }
  };

  return (
    <header className="bg-gray-900 sticky top-0 z-50">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center">
          {!isHomePage && (
            <button 
              onClick={handleBack}
              className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors mr-3"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
          )}
          <h1 className="text-2xl font-bold text-white tracking-tight">
            FreshAI
          </h1>
        </div>
        
        <Link href="/profile">
          <button className="w-12 h-12 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors">
            <User className="w-7 h-7 text-gray-600" />
          </button>
        </Link>
      </div>
    </header>
  );
}
