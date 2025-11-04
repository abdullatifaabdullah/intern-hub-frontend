'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ConnectionStatus from './ConnectionStatus';
import './Navbar.css';

export default function Navbar() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  if (!user) {
    return null;
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link href="/internships" className="navbar-logo">
          InternHub
        </Link>
        <ConnectionStatus className="navbar-connection" />
        <div className="navbar-links">
          <Link href="/internships" className="navbar-link">
            Internships
          </Link>
          {user.role === 'student' && (
            <Link href="/applications" className="navbar-link">
              My Applications
            </Link>
          )}
          {user.role === 'admin' && (
            <>
              <Link href="/admin/internships" className="navbar-link">
                My Internships
              </Link>
              <Link href="/admin/create" className="navbar-link">
                Create Internship
              </Link>
            </>
          )}
          <div className="navbar-user">
            <span className="navbar-email">{user.email}</span>
            <span className="navbar-role">({user.role})</span>
            <button onClick={handleSignOut} className="navbar-signout">
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

