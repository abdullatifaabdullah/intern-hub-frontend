'use client';

import { useState, useEffect } from 'react';
import './ConnectionStatus.css';

interface ConnectionStatusProps {
  className?: string;
}

export default function ConnectionStatus({ className }: ConnectionStatusProps) {
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [message, setMessage] = useState('Checking connection...');

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const checkConnection = async () => {
    try {
      const healthUrl = process.env.NEXT_PUBLIC_API_HEALTH_URL || 'http://localhost:8000/healthz';
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStatus('connected');
        setMessage('Backend connected');
      } else {
        setStatus('disconnected');
        setMessage(`Backend responded with status: ${response.status}`);
      }
    } catch (error: any) {
      setStatus('disconnected');
      if (error.message?.includes('ECONNREFUSED') || error.message?.includes('Failed to fetch')) {
        setMessage('Backend not reachable. Is it running on port 8000?');
      } else {
        setMessage(`Connection error: ${error.message}`);
      }
    }
  };

  return (
    <div className={`connection-status ${className || ''} ${status}`}>
      <div className="status-indicator"></div>
      <span className="status-message">{message}</span>
      <button onClick={checkConnection} className="refresh-button" title="Refresh connection status">
        🔄
      </button>
    </div>
  );
}


