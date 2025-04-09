
import * as React from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Expenses from "./pages/Expenses";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import { initDB } from "./lib/db";
import { ThemeProvider } from "./components/theme-provider";

// Create the QueryClient with better error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App: React.FC = () => {
  React.useEffect(() => {
    // Initialize database when app loads
    initDB().catch(error => {
      console.error("Failed to initialize database:", error);
    });
  }, []);

  return (
    <ThemeProvider defaultTheme="dark" storageKey="expense-tracker-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <HashRouter>
            {/* We're using only the sonner Toaster component to avoid conflicts */}
            <Toaster />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </HashRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
