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
      // Use the health URL from env, or derive from API_BASE_URL
      let healthUrl = process.env.NEXT_PUBLIC_API_HEALTH_URL;
      if (!healthUrl) {
        // Derive from API_BASE_URL if health URL is not set
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v2';
        // Remove trailing slashes and /api/v2, then add /healthz
        healthUrl = apiBaseUrl.replace(/\/api\/v2\/?$/, '/healthz');
      }
      // Force HTTPS for production domain - no exceptions
      if (healthUrl.includes('internhubapi.sadn.site')) {
        healthUrl = healthUrl.replace(/^http:\/\//, 'https://');
        healthUrl = healthUrl.replace(/http:\/\//g, 'https://');
      }
      // Also ensure HTTPS if page is served over HTTPS (production)
      if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
        healthUrl = healthUrl.replace(/^http:\/\//, 'https://');
      }
      // Create abort controller for timeout (more compatible than AbortSignal.timeout)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      try {
        const response = await fetch(healthUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          setStatus('connected');
          setMessage('Backend connected');
        } else {
          setStatus('disconnected');
          setMessage(`Backend responded with status: ${response.status}`);
        }
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error: any) {
      setStatus('disconnected');
      if (error.name === 'AbortError' || error.message?.includes('timeout')) {
        setMessage('Connection timeout - Backend may be slow or unreachable');
      } else if (error.message?.includes('ECONNREFUSED') || error.message?.includes('Failed to fetch')) {
        setMessage('Backend not reachable. Check if Cloudflare tunnel is running.');
      } else {
        setMessage(`Connection error: ${error.message || 'Unknown error'}`);
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





