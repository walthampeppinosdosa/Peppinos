import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

interface AlertContextType {
  showAlert: (message: string, type?: 'success' | 'error' | 'warning' | 'info', title?: string) => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

interface AlertState {
  isVisible: boolean;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
}

export const AlertProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [alert, setAlert] = useState<AlertState>({
    isVisible: false,
    message: '',
    type: 'info'
  });

  const showAlert = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', title?: string) => {
    setAlert({
      isVisible: true,
      message,
      type,
      title
    });

    // Auto-hide after 5 seconds for success/info, 7 seconds for error/warning
    const timeout = type === 'error' || type === 'warning' ? 7000 : 5000;
    setTimeout(() => {
      hideAlert();
    }, timeout);
  };

  const hideAlert = () => {
    setAlert(prev => ({ ...prev, isVisible: false }));
  };

  const getIcon = () => {
    switch (alert.type) {
      case 'success':
        return <CheckCircle className="h-4 w-4" />;
      case 'error':
        return <XCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4" />;
      case 'info':
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getVariant = () => {
    return alert.type === 'error' ? 'destructive' : 'default';
  };

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      {alert.isVisible && (
        <div className="fixed top-4 right-4 z-50 w-96">
          <Alert variant={getVariant()} className={`
            ${alert.type === 'success' ? 'border-green-500 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200' : ''}
            ${alert.type === 'warning' ? 'border-yellow-500 bg-yellow-50 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200' : ''}
            ${alert.type === 'info' ? 'border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200' : ''}
            shadow-lg
          `}>
            {getIcon()}
            <div className="flex-1">
              {alert.title && <AlertTitle>{alert.title}</AlertTitle>}
              <AlertDescription>{alert.message}</AlertDescription>
            </div>
            <button
              onClick={hideAlert}
              className="absolute top-2 right-2 p-1 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          </Alert>
        </div>
      )}
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};
