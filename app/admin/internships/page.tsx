'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { apiClient, formatApiError } from '@/lib/api';
import type { Internship } from '@/types';
import './page.css';

export default function AdminInternshipsPage() {
  const { user } = useAuth();
  const [internships, setInternships] = useState<Internship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const limit = 20;

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadInternships();
    }
  }, [user, page]);

  const loadInternships = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await apiClient.getMyInternships({
        page,
        limit,
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

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this internship?')) {
      return;
    }

    try {
      await apiClient.deleteInternship(id);
      setInternships(internships.filter((i) => i.id !== id));
    } catch (err: any) {
      alert(formatApiError(err) || 'Failed to delete internship');
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
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="admin-internships-page">
        <Navbar />
        <div className="admin-container">
          <div className="page-header">
            <h1 className="page-title">My Internships</h1>
            <Link href="/admin/create" className="create-button">
              + Create New Internship
            </Link>
          </div>

          {error && <div className="error-message">{error}</div>}

          {loading && internships.length === 0 ? (
            <div className="loading">Loading internships...</div>
          ) : internships.length === 0 ? (
            <div className="empty-state">
              <p>You haven't created any internships yet.</p>
              <Link href="/admin/create" className="empty-link">
                Create Your First Internship
              </Link>
            </div>
          ) : (
            <>
              <div className="internships-grid">
                {internships.map((internship) => (
                  <div key={internship.id} className="internship-card">
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
                    <div className="internship-actions">
                      <Link
                        href={`/internships/${internship.id}`}
                        className="action-button view-button"
                      >
                        View
                      </Link>
                      <Link
                        href={`/admin/internships/${internship.id}/edit`}
                        className="action-button edit-button"
                      >
                        Edit
                      </Link>
                      <Link
                        href={`/admin/internships/${internship.id}/applications`}
                        className="action-button applications-button"
                      >
                        Applications
                      </Link>
                      <button
                        onClick={() => handleDelete(internship.id)}
                        className="action-button delete-button"
                      >
                        Delete
                      </button>
                    </div>
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


