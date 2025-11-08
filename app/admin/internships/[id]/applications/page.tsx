'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { apiClient, formatApiError } from '@/lib/api';
import type { Application, Internship } from '@/types';
import './page.css';

export default function InternshipApplicationsPage() {
  const params = useParams();
  const { user } = useAuth();
  const internshipId = Number(params.id);
  const [internship, setInternship] = useState<Internship | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const limit = 20;

  useEffect(() => {
    if (user && user.role === 'admin' && internshipId) {
      loadData();
    }
  }, [user, internshipId, page]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('Loading internship and applications for ID:', internshipId);
      
      // Load internship and applications in parallel
      const [internshipData, applicationsData] = await Promise.all([
        apiClient.getInternship(internshipId),
        apiClient.getInternshipApplications(internshipId, {
          page,
          limit,
          include: ['user'],
        }),
      ]);

      console.log('Internship loaded:', internshipData);
      console.log('Applications loaded:', applicationsData);
      setInternship(internshipData);
      setApplications(applicationsData);
      setHasMore(applicationsData.length === limit);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(formatApiError(err) || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (applicationId: number, status: string) => {
    try {
      setUpdatingStatus(applicationId);
      await apiClient.updateApplication(applicationId, { status });
      // Reload applications - if this fails, we still succeeded in updating
      try {
        const applicationsData = await apiClient.getInternshipApplications(internshipId, {
          page,
          limit,
          include: ['user'],
        });
        setApplications(applicationsData);
      } catch (reloadErr: any) {
        console.error('Error reloading applications after update:', reloadErr);
        // Don't show error to user since the update succeeded
        // Just reload the page data separately
        loadData();
      }
    } catch (err: any) {
      console.error('Error updating application status:', err);
      alert(formatApiError(err) || 'Failed to update application status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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

  if (loading && !internship) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <div className="applications-page">
          <Navbar />
          <div className="applications-container">
            <div className="loading">Loading...</div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="applications-page">
        <Navbar />
        <div className="applications-container">
          <Link href="/admin/internships" className="back-link">
            ← Back to My Internships
          </Link>

          {internship && (
            <div className="internship-header">
              <h1 className="page-title">Applications for: {internship.title}</h1>
              <div className="internship-info">
                <span>{internship.company}</span>
                {internship.location && <span>📍 {internship.location}</span>}
              </div>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          {loading && applications.length === 0 ? (
            <div className="loading">Loading applications...</div>
          ) : applications.length === 0 ? (
            <div className="empty-state">No applications yet for this internship.</div>
          ) : (
            <>
              <div className="applications-list">
                {applications.map((application) => (
                  <div key={application.id} className="application-card">
                    <div className="application-header">
                      <div>
                        <div className="application-applicant">
                          {application.user ? (
                            <strong>{application.user.email}</strong>
                          ) : (
                            <span>User ID: {application.user_id}</span>
                          )}
                        </div>
                        <div className="application-date">
                          Applied on: {formatDate(application.created_at)}
                        </div>
                      </div>
                      {getStatusBadge(application.status)}
                    </div>

                    {application.cover_letter && (
                      <div className="application-cover-letter">
                        <strong>Cover Letter:</strong>
                        <p>{application.cover_letter}</p>
                      </div>
                    )}

                    <div className="application-actions">
                      <button
                        onClick={() => handleStatusUpdate(application.id, 'approved')}
                        disabled={updatingStatus === application.id || application.status === 'approved' || application.status === 'accepted'}
                        className="status-button accept-button"
                      >
                        {updatingStatus === application.id ? 'Updating...' : 'Accept'}
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(application.id, 'rejected')}
                        disabled={updatingStatus === application.id || application.status === 'rejected'}
                        className="status-button reject-button"
                      >
                        {updatingStatus === application.id ? 'Updating...' : 'Reject'}
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(application.id, 'pending')}
                        disabled={updatingStatus === application.id || application.status === 'pending'}
                        className="status-button pending-button"
                      >
                        {updatingStatus === application.id ? 'Updating...' : 'Set Pending'}
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





