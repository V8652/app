
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface MobileNavProps {
  routes: {
    href: string;
    label: string;
    icon: React.ComponentType<{
      className?: string;
    }>;
    active: boolean;
  }[];
  onClose: () => void;
}

export const MobileNav = ({
  routes,
  onClose
}: MobileNavProps) => {
  const containerVariants = {
    hidden: { x: '-100%' },
    visible: { 
      x: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
        when: "beforeChildren",
        staggerChildren: 0.05
      }
    },
    exit: { 
      x: "-100%",
      transition: { 
        type: "spring",
        stiffness: 300,
        damping: 30,
        when: "afterChildren",
        staggerChildren: 0.05,
        staggerDirection: -1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };

  return (
    <div className="fixed inset-0 top-14 z-40 flex md:hidden">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 bg-background/80 backdrop-blur-sm" 
        onClick={onClose} 
      />
      
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="fixed top-14 left-0 bottom-0 w-[280px] max-w-[85%] bg-card border-r shadow-lg flex flex-col z-50"
      >
        {/* User account section */}
        <div className="p-5 border-b flex items-center space-x-3 shrink-0">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/10 text-primary">VK</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">MoneyMinder</p>
            <p className="text-xs text-muted-foreground">Manage your expenses efficiently</p>
          </div>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 ml-auto md:hidden" 
            onClick={onClose}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>
        
        {/* Navigation links with scroll area to ensure visibility */}
        <ScrollArea className="flex-1 overflow-y-auto py-2">
          <nav className="p-4">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 pl-2">
              Main Menu
            </div>
            <div className="space-y-1">
              {routes.map((route, i) => (
                <motion.div
                  key={route.href}
                  variants={itemVariants}
                  custom={i}
                >
                  <Link
                    to={route.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                      route.active 
                        ? "bg-primary/10 text-primary" 
                        : "text-foreground hover:bg-accent/50"
                    )}
                  >
                    <route.icon className={cn("h-5 w-5 mr-3", route.active ? "text-primary" : "")} />
                    {route.label}
                  </Link>
                </motion.div>
              ))}
            </div>
            
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-6 mb-3 pl-2">
              Support
            </div>
            <div className="space-y-1">
              <Link
                to="/help"
                onClick={onClose}
                className="flex items-center px-3 py-3 rounded-lg text-sm font-medium transition-colors text-foreground hover:bg-accent/50"
              >
                <span className="h-5 w-5 mr-3 flex items-center justify-center">?</span>
                Help & Support
              </Link>
            </div>
          </nav>
        </ScrollArea>
        
        {/* Version info - now in a fixed position at bottom */}
        <div className="mt-auto p-4 pt-2 border-t text-center text-xs text-muted-foreground shrink-0">
          <p>Version 1.0.0</p>
          <p className="mt-1">© 2025 VK Creation</p>
        </div>
      </motion.div>
    </div>
  );
};
