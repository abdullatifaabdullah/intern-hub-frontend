'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { apiClient, formatApiError } from '@/lib/api';
import type { Internship } from '@/types';
import './page.css';

export default function InternshipsPage() {
  const { user } = useAuth();
  const [internships, setInternships] = useState<Internship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const limit = 20;

  useEffect(() => {
    if (user) {
      loadInternships();
    }
  }, [user, page]);

  const loadInternships = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await apiClient.getInternships({
        page,
        limit,
        sort: '-created_at',
        include: ['creator'],
      });
      setInternships(data);
      setHasMore(data.length === limit);
    } catch (err: any) {
      setError(formatApiError(err) || 'Failed to load internships');
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

  return (
    <ProtectedRoute>
      <div className="internships-page">
        <Navbar />
        <div className="internships-container">
          <h1 className="page-title">Available Internships</h1>

          {error && <div className="error-message">{error}</div>}

          {loading && internships.length === 0 ? (
            <div className="loading">Loading internships...</div>
          ) : internships.length === 0 ? (
            <div className="empty-state">No internships available</div>
          ) : (
            <>
              <div className="internships-grid">
                {internships.map((internship) => (
                  <Link
                    key={internship.id}
                    href={`/internships/${internship.id}`}
                    className="internship-card"
                  >
                    <h2 className="internship-title">{internship.title}</h2>
                    <div className="internship-company">{internship.company}</div>
                    {internship.location && (
                      <div className="internship-location">📍 {internship.location}</div>
                    )}
                    <div className="internship-deadline">
                      Deadline: {formatDate(internship.application_deadline)}
                    </div>
                    <p className="internship-description">
                      {internship.description.substring(0, 150)}
                      {internship.description.length > 150 ? '...' : ''}
                    </p>
                    {internship.creator && (
                      <div className="internship-creator">
                        Created by: {internship.creator.email}
                      </div>
                    )}
                  </Link>
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


