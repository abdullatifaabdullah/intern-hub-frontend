'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import './page.css';

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push('/internships');
      } else {
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="loading-container">
      <div className="loading-spinner">Loading...</div>
    </div>
  );
}





