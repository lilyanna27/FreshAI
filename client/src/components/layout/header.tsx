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
    <header className="sticky top-0 z-50" style={{backgroundColor: '#1e3a2e'}}>
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center">
          <button 
            onClick={handleBack}
            className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors mr-3"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-2xl font-bold text-white tracking-tight" style={{fontFamily: 'Times New Roman, serif'}}>
            FreshAI
          </h1>
        </div>
        
        <Link href="/profile">
          <button className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
            <User className="w-5 h-5 text-white" />
          </button>
        </Link>
      </div>
    </header>
  );
}
