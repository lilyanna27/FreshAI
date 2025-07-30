import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState } from "react";

import Header from "@/components/layout/header";
import BottomNavigation from "@/components/layout/bottom-navigation";
import FloatingActionButton from "@/components/ui/floating-action-button";
import AddItemModal from "@/components/modals/add-item-modal";

import Home from "@/pages/home";
import Fridge from "@/pages/fridge";
import Recipes from "@/pages/recipes";
import Expiring from "@/pages/expiring";
import ReceiptScan from "@/pages/receipt-scan";
import Sustainability from "@/pages/sustainability";
import NotFound from "@/pages/not-found";

function Router() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  return (
    <div className="max-w-md mx-auto bg-gray-900 min-h-screen shadow-xl relative">
      <Header />
      
      <main className="pb-20">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/fridge" component={Fridge} />
          <Route path="/recipes" component={Recipes} />
          <Route path="/receipt-scan" component={ReceiptScan} />
          <Route path="/sustainability" component={Sustainability} />
          <Route path="/expiring" component={Expiring} />
          <Route component={NotFound} />
        </Switch>
      </main>

      <FloatingActionButton onClick={() => setIsAddModalOpen(true)} />
      <BottomNavigation />
      
      <AddItemModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
      />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
