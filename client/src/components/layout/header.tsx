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

  // Don't show header on home page (it has its own orange header)
  if (isHomePage) {
    return null;
  }

  return (
    <header className="bg-white sticky top-0 z-50 border-b border-gray-200">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center">
          <button 
            onClick={handleBack}
            className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors mr-3"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">
            FreshAI
          </h1>
        </div>
        
        <Link href="/profile">
          <button className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors">
            <User className="w-5 h-5 text-gray-700" />
          </button>
        </Link>
      </div>
    </header>
  );
}
