
import { toast as sonnerToast } from "sonner";
import { v4 as uuidv4 } from "uuid";

// Import the Action type from sonner to ensure our types are compatible
// Action type requires onClick to be required
type Action = {
  label: string;
  onClick: () => void;
};

// Define ToastProps with the correct Action type for cancel
type ToastProps = {
  id?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: "default" | "destructive" | "success";
  duration?: number;
  action?: Action;
  cancel?: Action; // Now using the Action type that requires onClick
  onDismiss?: () => void;
  onAutoClose?: () => void;
  className?: string;
  closable?: boolean;
  important?: boolean;
  promise?: Promise<any>;
};

// Fixed version of the useToast hook
export const useToast = () => {
  const toast = ({ title, description, variant = "default", ...props }: ToastProps) => {
    // Ensure we have an ID for every toast
    const id = props.id || uuidv4();
    
    // Prepare props to pass to sonnerToast
    const sonnerProps = {
      id,
      description,
      ...props
    };
    
    // Convert our variant to sonner's type
    if (variant === "destructive") {
      return sonnerToast.error(title as string, sonnerProps);
    } else if (variant === "success") {
      return sonnerToast.success(title as string, sonnerProps);
    } else {
      // Default case
      return sonnerToast(title as string, sonnerProps);
    }
  };

  return { toast };
};

// Export a direct toast function as well for easier access
export const toast = ({ title, description, variant = "default", ...props }: ToastProps) => {
  // Ensure we have an ID for every toast
  const id = props.id || uuidv4();
  
  // Prepare props to pass to sonnerToast
  const sonnerProps = {
    id,
    description,
    ...props
  };
  
  // Convert our variant to sonner's type
  if (variant === "destructive") {
    return sonnerToast.error(title as string, sonnerProps);
  } else if (variant === "success") {
    return sonnerToast.success(title as string, sonnerProps);
  } else {
    // Default case
    return sonnerToast(title as string, sonnerProps);
  }
};
