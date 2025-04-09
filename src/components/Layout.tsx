
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MobileNav } from './MobileNav';
import { BarChart, Home, Settings, CreditCard, Menu, X, ArrowLeft, Mail, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { useIsMobile } from '@/hooks/use-mobile';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const [isOpen, setIsOpen] = React.useState(false);
  const isMobile = useIsMobile();
  const isRootPage = location.pathname === '/';

  const routes = [
    {
      href: '/',
      label: 'Dashboard',
      icon: Home,
      active: location.pathname === '/',
    },
    {
      href: '/expenses',
      label: 'Expenses',
      icon: CreditCard,
      active: location.pathname === '/expenses',
    },
    {
      href: '/analytics',
      label: 'Analytics',
      icon: BarChart,
      active: location.pathname === '/analytics',
    },
    {
      href: '/settings',
      label: 'Settings',
      icon: Settings,
      active: location.pathname === '/settings',
    },
  ];

  // Find the current route for displaying the title in mobile header
  const currentRoute = routes.find(route => route.active) || routes[0];

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="z-30 hidden md:flex flex-col w-64 border-r bg-card">
        <div className="p-6">
          <h1 className="text-xl font-bold tracking-tight">MoneyMinder</h1>
        </div>
        <div className="flex-1 px-3 py-2">
          <nav className="flex flex-col space-y-1">
            {routes.map((route) => (
              <Link
                key={route.href}
                to={route.href}
                className={cn(
                  "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  route.active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <route.icon className="h-5 w-5 mr-2" />
                {route.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="p-4 border-t flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            v1.0.0
          </span>
          <ThemeToggle />
        </div>
      </aside>

      {/* Mobile Layout */}
      <div className="flex flex-col flex-1">
        {/* Android-style header with dark black background */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 bg-black text-white px-4 md:hidden shadow-sm">
          {!isRootPage && (
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back</span>
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 md:hidden"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
            <span className="sr-only">Toggle Menu</span>
          </Button>
          
          <h1 className="text-lg font-medium">{currentRoute.label}</h1>
          
          <div className="ml-auto flex items-center gap-2 md:hidden">
            {/* Gmail Connected Button in header */}
            {location.pathname === '/' && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-white/10 rounded-full bg-green-500/10"
                aria-label="Gmail Connected"
              >
                <Check className="h-5 w-5 text-green-500" />
              </Button>
            )}
            <ThemeToggle />
          </div>
        </header>

        {/* Mobile Nav Drawer - Android Style */}
        {isOpen && <MobileNav routes={routes} onClose={() => setIsOpen(false)} />}

        {/* Main Content with proper padding for mobile */}
        <main className="flex-1 p-4 md:p-6 android-content-padding">{children}</main>
        
        {/* Android-style bottom navigation for mobile */}
        {isMobile && (
          <nav className="fixed bottom-0 left-0 right-0 z-30 bg-background border-t flex justify-around items-center h-16 px-2">
            {routes.map((route) => (
              <Link
                key={route.href}
                to={route.href}
                className={cn(
                  "flex flex-col items-center justify-center px-3 py-1 rounded-md transition-colors",
                  route.active
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <route.icon className={cn(
                  "h-5 w-5 mb-1",
                  route.active ? "text-primary" : "text-muted-foreground"
                )} />
                <span className="text-xs font-medium">{route.label}</span>
              </Link>
            ))}
          </nav>
        )}
        
        {/* Add bottom padding when showing the bottom nav */}
        {isMobile && <div className="h-16"></div>}
      </div>
    </div>
  );
};

export default Layout;
