'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { apiClient, formatApiError } from '@/lib/api';
import type { Internship } from '@/types';
import './page.css';

export default function InternshipDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [internship, setInternship] = useState<Internship | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applying, setApplying] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [applicationSuccess, setApplicationSuccess] = useState(false);

  const internshipId = Number(params.id);

  useEffect(() => {
    if (user && internshipId) {
      loadInternship();
    }
  }, [user, internshipId]);

  const loadInternship = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await apiClient.getInternship(internshipId, ['creator']);
      setInternship(data);
    } catch (err: any) {
      setError(formatApiError(err) || 'Failed to load internship');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!user || user.role !== 'student') return;

    try {
      setApplying(true);
      setError('');
      await apiClient.applyToInternship(internshipId, {
        cover_letter: coverLetter || undefined,
      });
      setApplicationSuccess(true);
      setCoverLetter('');
    } catch (err: any) {
      setError(formatApiError(err) || 'Failed to apply to internship');
    } finally {
      setApplying(false);
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

  const isDeadlinePassed = (dateString: string) => {
    return new Date(dateString) < new Date();
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="internship-detail-page">
          <Navbar />
          <div className="detail-container">
            <div className="loading">Loading internship details...</div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!internship) {
    return (
      <ProtectedRoute>
        <div className="internship-detail-page">
          <Navbar />
          <div className="detail-container">
            <div className="error-message">{error || 'Internship not found'}</div>
            <Link href="/internships" className="back-link">
              ← Back to Internships
            </Link>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="internship-detail-page">
        <Navbar />
        <div className="detail-container">
          <Link href="/internships" className="back-link">
            ← Back to Internships
          </Link>

          {error && <div className="error-message">{error}</div>}
          {applicationSuccess && (
            <div className="success-message">
              Application submitted successfully!
            </div>
          )}

          <div className="internship-detail-card">
            <h1 className="detail-title">{internship.title}</h1>
            <div className="detail-company">{internship.company}</div>
            {internship.location && (
              <div className="detail-location">📍 {internship.location}</div>
            )}
            <div
              className={`detail-deadline ${
                isDeadlinePassed(internship.application_deadline) ? 'deadline-passed' : ''
              }`}
            >
              Application Deadline: {formatDate(internship.application_deadline)}
              {isDeadlinePassed(internship.application_deadline) && (
                <span className="deadline-badge"> (Passed)</span>
              )}
            </div>
            {internship.creator && (
              <div className="detail-creator">
                Created by: {internship.creator.email}
              </div>
            )}
            <div className="detail-description">
              <h2>Description</h2>
              <p>{internship.description}</p>
            </div>

            {user?.role === 'student' && (
              <div className="application-section">
                <h2>Apply to this Internship</h2>
                {!isDeadlinePassed(internship.application_deadline) ? (
                  <>
                    <div className="form-group">
                      <label htmlFor="cover-letter" className="form-label">
                        Cover Letter (Optional)
                      </label>
                      <textarea
                        id="cover-letter"
                        value={coverLetter}
                        onChange={(e) => setCoverLetter(e.target.value)}
                        className="form-textarea"
                        rows={6}
                        placeholder="Tell us why you're interested in this position..."
                      />
                    </div>
                    <button
                      onClick={handleApply}
                      disabled={applying}
                      className="apply-button"
                    >
                      {applying ? 'Applying...' : 'Submit Application'}
                    </button>
                  </>
                ) : (
                  <div className="deadline-message">
                    The application deadline has passed.
                  </div>
                )}
              </div>
            )}

            {user?.role === 'admin' && (
              <div className="admin-actions">
                <Link
                  href={`/admin/internships/${internship.id}/edit`}
                  className="admin-button edit-button"
                >
                  Edit Internship
                </Link>
                <Link
                  href={`/admin/internships/${internship.id}/applications`}
                  className="admin-button view-applications-button"
                >
                  View Applications
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}


