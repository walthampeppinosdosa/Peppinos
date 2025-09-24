import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, AlertCircle, CheckCircle } from 'lucide-react';

interface ConnectionStatusProps {
  isConnected: boolean;
  lastUpdateTime?: Date | null;
  className?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  lastUpdateTime,
  className = ''
}) => {
  const getStatusConfig = () => {
    if (isConnected) {
      return {
        icon: Wifi,
        text: 'Live Updates',
        variant: 'default' as const,
        className: 'bg-green-100 text-green-800 border-green-200'
      };
    } else {
      return {
        icon: WifiOff,
        text: 'Disconnected',
        variant: 'destructive' as const,
        className: 'bg-red-100 text-red-800 border-red-200'
      };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge className={`flex items-center gap-1 ${config.className}`}>
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
      
      {lastUpdateTime && (
        <div className="text-xs text-muted-foreground">
          Last update: {lastUpdateTime.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

interface DetailedConnectionStatusProps {
  isConnected: boolean;
  lastUpdateTime?: Date | null;
  reconnectAttempts?: number;
  maxReconnectAttempts?: number;
  onReconnect?: () => void;
}

export const DetailedConnectionStatus: React.FC<DetailedConnectionStatusProps> = ({
  isConnected,
  lastUpdateTime,
  reconnectAttempts = 0,
  maxReconnectAttempts = 5,
  onReconnect
}) => {
  const getStatusDetails = () => {
    if (isConnected) {
      return {
        icon: CheckCircle,
        title: 'Connected',
        description: 'Real-time updates are active',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      };
    } else if (reconnectAttempts > 0 && reconnectAttempts < maxReconnectAttempts) {
      return {
        icon: AlertCircle,
        title: 'Reconnecting...',
        description: `Attempt ${reconnectAttempts}/${maxReconnectAttempts}`,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200'
      };
    } else {
      return {
        icon: WifiOff,
        title: 'Disconnected',
        description: 'Real-time updates are not available',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      };
    }
  };

  const status = getStatusDetails();
  const Icon = status.icon;

  return (
    <div className={`p-3 rounded-lg border ${status.bgColor} ${status.borderColor}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${status.color}`} />
          <div>
            <div className={`font-medium ${status.color}`}>
              {status.title}
            </div>
            <div className="text-sm text-muted-foreground">
              {status.description}
            </div>
          </div>
        </div>
        
        {!isConnected && onReconnect && (
          <button
            onClick={onReconnect}
            className="text-sm px-2 py-1 rounded bg-white border hover:bg-gray-50 transition-colors"
          >
            Retry
          </button>
        )}
      </div>
      
      {lastUpdateTime && (
        <div className="mt-2 text-xs text-muted-foreground">
          Last update: {lastUpdateTime.toLocaleString()}
        </div>
      )}
    </div>
  );
};
