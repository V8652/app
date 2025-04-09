
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MobileNav } from './MobileNav';
import { BarChart, Home, Settings, CreditCard, Menu, X, ArrowLeft, Bell, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { useIsMobile } from '@/hooks/use-mobile';
import { GmailUserIcon } from './GmailUserIcon';
import { AnimatePresence, motion } from 'framer-motion';
import { useTheme } from '@/components/theme-provider';

interface LayoutProps {
  children: React.ReactNode;
  currentPath?: string; // Add optional prop for when used outside router
}

const Layout: React.FC<LayoutProps> = ({ children, currentPath }) => {
  // Use the provided path or get it from the router if available
  let location;
  try {
    location = useLocation();
  } catch (error) {
    // If useLocation fails, we're outside of a Router context
    // Use the provided currentPath instead
    location = { pathname: currentPath || '/' };
  }
  
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const isMobile = useIsMobile();
  const isRootPage = location.pathname === '/';
  const { theme, setTheme } = useTheme();

  // Track scroll for header styling
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
      <aside className="z-30 hidden md:flex flex-col w-64 border-r bg-card shadow-sm">
        <div className="p-6">
          <Link to="/">
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              MoneyMinder
            </h1>
          </Link>
        </div>
        <div className="flex-1 px-3 py-2">
          <nav className="flex flex-col space-y-1">
            {routes.map((route) => (
              <Link
                key={route.href}
                to={route.href}
                className={cn(
                  "flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  route.active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <route.icon className={cn(
                  "h-5 w-5 mr-3 transition-colors",
                  route.active ? "text-primary" : "text-muted-foreground"
                )} />
                {route.label}
                
                {route.active && (
                  <motion.div 
                    className="w-1 h-6 rounded-full bg-primary ml-auto"
                    layoutId="activeIndicator"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </Link>
            ))}
          </nav>
        </div>
        <div className="p-4 border-t flex items-center justify-between">
          <ThemeToggle />
          <span className="text-sm font-medium text-muted-foreground">
            v1.0.0
          </span>
        </div>
      </aside>

      {/* Mobile Layout */}
      <div className="flex flex-col flex-1">
        {/* Modern header with blur effect on scroll */}
        <header 
          className={cn(
            "sticky top-0 z-30 flex h-16 items-center gap-4 transition-all duration-200",
            scrolled 
              ? "bg-background/80 backdrop-blur-md border-b shadow-sm" 
              : "bg-background",
            "md:px-6 px-4"
          )}
        >
          <div className="flex items-center md:hidden">
            {!isRootPage && (
              <Button
                variant="ghost"
                size="icon"
                className="mr-1 text-foreground hover:bg-accent"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="sr-only">Back</span>
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              className="text-foreground hover:bg-accent md:hidden"
              onClick={() => setIsOpen(!isOpen)}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={isOpen ? 'close' : 'menu'}
                  initial={{ opacity: 0, rotate: isOpen ? 90 : -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: isOpen ? -90 : 90 }}
                  transition={{ duration: 0.2 }}
                >
                  {isOpen ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <Menu className="h-5 w-5" />
                  )}
                </motion.div>
              </AnimatePresence>
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </div>
          
          <div className="md:hidden">
            <h1 className="text-lg font-medium">{currentRoute.label}</h1>
          </div>
          
          {/* Desktop header title */}
          <div className="hidden md:block">
            <h1 className="text-xl font-bold">{currentRoute.label}</h1>
          </div>
          
          <div className="ml-auto flex items-center gap-3">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Bell className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={theme === 'dark' ? 'dark' : 'light'}
                  initial={{ opacity: 0, rotate: theme === 'dark' ? 90 : -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: theme === 'dark' ? -90 : 90 }}
                  transition={{ duration: 0.2 }}
                >
                  {theme === 'dark' ? (
                    <Moon className="h-5 w-5" />
                  ) : (
                    <Sun className="h-5 w-5" />
                  )}
                </motion.div>
              </AnimatePresence>
            </Button>
            <GmailUserIcon />
          </div>
        </header>

        {/* Mobile Nav Drawer with modern animations */}
        <AnimatePresence>
          {isOpen && <MobileNav routes={routes} onClose={() => setIsOpen(false)} />}
        </AnimatePresence>

        {/* Main Content with proper padding and responsive layout */}
        <main className="flex-1 p-4 md:p-6 overflow-auto max-w-screen-2xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
        
        {/* Modern bottom navigation for mobile */}
        {isMobile && (
          <motion.nav 
            className="fixed bottom-0 left-0 right-0 z-30 bg-card/80 backdrop-blur-md border-t flex justify-around items-center h-16 px-2"
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
          >
            {routes.map((route) => (
              <Link
                key={route.href}
                to={route.href}
                className={cn(
                  "flex flex-col items-center justify-center px-3 py-1 rounded-lg transition-colors relative",
                  route.active
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                {route.active && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 bg-primary/10 rounded-lg -z-10"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <route.icon className={cn(
                  "h-5 w-5 mb-1",
                  route.active ? "text-primary" : "text-muted-foreground"
                )} />
                <span className="text-xs font-medium">{route.label}</span>
              </Link>
            ))}
          </motion.nav>
        )}
        
        {/* Add bottom padding when showing the bottom nav */}
        {isMobile && <div className="h-16 flex-shrink-0"></div>}
      </div>
    </div>
  );
};

export default Layout;
