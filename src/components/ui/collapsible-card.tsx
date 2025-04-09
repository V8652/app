
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { Button } from './button';
import { motion, AnimatePresence } from 'framer-motion';

interface CollapsibleCardProps {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  icon?: React.ReactNode;
  elevated?: boolean;
  hoverEffect?: boolean;
  glassmorphism?: boolean;
}

export function CollapsibleCard({
  title,
  description,
  defaultOpen = true,
  className,
  headerClassName,
  contentClassName,
  children,
  footer,
  icon,
  elevated = false,
  hoverEffect = true,
  glassmorphism = false
}: CollapsibleCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card 
      className={cn(
        'overflow-hidden transition-all duration-300 rounded-xl',
        elevated ? 'shadow-premium' : 'shadow-card border-0',
        hoverEffect && (elevated ? 'hover:shadow-premium-hover' : 'hover:shadow-card-hover'),
        glassmorphism && 'glass-card',
        className
      )}
    >
      <CardHeader 
        className={cn(
          'flex flex-row items-center justify-between space-y-0 gap-4 cursor-pointer group transition-colors',
          isOpen ? 'pb-3' : 'pb-6',
          headerClassName
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          {icon && (
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-primary/10 text-primary">
              {icon}
            </div>
          )}
          <div>
            <CardTitle className="text-xl font-medium group-hover:text-primary transition-colors">{title}</CardTitle>
            {description && (
              <CardDescription className="mt-0.5 text-sm">{description}</CardDescription>
            )}
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 shrink-0 rounded-full"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
        >
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-4 w-4" />
          </motion.div>
        </Button>
      </CardHeader>
      
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <CardContent className={cn('pt-0', contentClassName)}>
              {children}
            </CardContent>
            
            {footer && (
              <CardFooter className="flex justify-between pt-0">
                {footer}
              </CardFooter>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
