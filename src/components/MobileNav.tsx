
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface MobileNavProps {
  routes: {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    active: boolean;
  }[];
  onClose: () => void;
}

export const MobileNav = ({ routes, onClose }: MobileNavProps) => {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 top-14 z-40 flex md:hidden"
      >
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: 0 }}
          exit={{ x: "-100%" }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="fixed top-14 left-0 bottom-0 w-72 max-w-[80%] bg-background border-r shadow-lg overflow-y-auto"
        >
          {/* User account section */}
          <div className="p-4 border-b flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary">MM</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">MoneyMinder</p>
              <p className="text-xs text-muted-foreground">Manage your expenses efficiently</p>
            </div>
          </div>
          
          {/* Navigation links */}
          <nav className="p-4">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 pl-2">
              Main Menu
            </div>
            <div className="space-y-1">
              {routes.map((route) => (
                <Link
                  key={route.href}
                  to={route.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                    route.active
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-accent/50"
                  )}
                >
                  <route.icon className={cn("h-5 w-5 mr-3", route.active ? "text-primary" : "")} />
                  {route.label}
                </Link>
              ))}
            </div>
            
            {/* Version info */}
            <div className="mt-8 pt-4 border-t text-center text-xs text-muted-foreground">
              <p>Version 1.0.0</p>
              <p className="mt-1">© 2023 MoneyMinder</p>
            </div>
          </nav>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
