'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { apiClient, formatApiError } from '@/lib/api';
import type { Application } from '@/types';
import './page.css';

export default function ApplicationsPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const limit = 20;

  useEffect(() => {
    if (user && user.role === 'student') {
      loadApplications();
    }
  }, [user, page]);

  const loadApplications = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('Loading applications...');
      const data = await apiClient.getMyApplications({
        page,
        limit,
        sort: '-created_at',
        include: ['internship'],
      });
      console.log('Applications loaded:', data);
      setApplications(data);
      setHasMore(data.length === limit);
    } catch (err: any) {
      console.error('Error loading applications:', err);
      setError(formatApiError(err) || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return <span className="status-badge pending">Pending</span>;
    const statusLower = status.toLowerCase();
    // Check for both 'approved' (database value) and 'accepted' (legacy/display value)
    if (statusLower === 'approved' || statusLower === 'accepted') {
      return <span className="status-badge accepted">Accepted</span>;
    } else if (statusLower === 'rejected') {
      return <span className="status-badge rejected">Rejected</span>;
    }
    return <span className="status-badge pending">{status}</span>;
  };

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <div className="applications-page">
        <Navbar />
        <div className="applications-container">
          <h1 className="page-title">My Applications</h1>

          {error && <div className="error-message">{error}</div>}

          {loading && applications.length === 0 ? (
            <div className="loading">Loading applications...</div>
          ) : applications.length === 0 ? (
            <div className="empty-state">
              <p>You haven't applied to any internships yet.</p>
              <Link href="/internships" className="empty-link">
                Browse Available Internships
              </Link>
            </div>
          ) : (
            <>
              <div className="applications-list">
                {applications.map((application) => (
                  <div key={application.id} className="application-card">
                    {application.internship ? (
                      <>
                        <div className="application-header">
                          <Link
                            href={`/internships/${application.internship.id}`}
                            className="application-title"
                          >
                            {application.internship.title}
                          </Link>
                          {getStatusBadge(application.status)}
                        </div>
                        <div className="application-company">
                          {application.internship.company}
                        </div>
                        {application.internship.location && (
                          <div className="application-location">
                            📍 {application.internship.location}
                          </div>
                        )}
                        {application.cover_letter && (
                          <div className="application-cover-letter">
                            <strong>Cover Letter:</strong>
                            <p>{application.cover_letter}</p>
                          </div>
                        )}
                        <div className="application-meta">
                          <span>Applied on: {formatDate(application.created_at)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="application-error">
                        Internship information not available
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="pagination">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                  className="pagination-button"
                >
                  Previous
                </button>
                <span className="pagination-page">Page {page}</span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!hasMore || loading}
                  className="pagination-button"
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}





