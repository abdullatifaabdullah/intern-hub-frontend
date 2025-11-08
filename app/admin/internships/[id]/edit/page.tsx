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

export default function EditInternshipPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const internshipId = Number(params.id);
  const [internship, setInternship] = useState<Internship | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    company: '',
    location: '',
    application_deadline: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && internshipId) {
      loadInternship();
    }
  }, [user, internshipId]);

  const loadInternship = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await apiClient.getInternship(internshipId);
      setInternship(data);
      // Format deadline for datetime-local input
      const deadlineDate = new Date(data.application_deadline);
      const localDateTime = new Date(deadlineDate.getTime() - deadlineDate.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setFormData({
        title: data.title,
        description: data.description,
        company: data.company,
        location: data.location || '',
        application_deadline: localDateTime,
      });
    } catch (err: any) {
      setError(formatApiError(err) || 'Failed to load internship');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await apiClient.updateInternship(internshipId, {
        ...formData,
        application_deadline: new Date(formData.application_deadline).toISOString(),
      });
      router.push('/admin/internships');
    } catch (err: any) {
      setError(formatApiError(err) || 'Failed to update internship');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <div className="edit-internship-page">
          <Navbar />
          <div className="edit-container">
            <div className="loading">Loading internship...</div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!internship) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <div className="edit-internship-page">
          <Navbar />
          <div className="edit-container">
            <div className="error-message">{error || 'Internship not found'}</div>
            <Link href="/admin/internships" className="back-link">
              ← Back to My Internships
            </Link>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="edit-internship-page">
        <Navbar />
        <div className="edit-container">
          <Link href="/admin/internships" className="back-link">
            ← Back to My Internships
          </Link>

          <h1 className="page-title">Edit Internship</h1>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit} className="edit-form">
            <div className="form-group">
              <label htmlFor="title" className="form-label">
                Title *
              </label>
              <input
                id="title"
                name="title"
                type="text"
                value={formData.title}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="company" className="form-label">
                Company *
              </label>
              <input
                id="company"
                name="company"
                type="text"
                value={formData.company}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="location" className="form-label">
                Location *
              </label>
              <input
                id="location"
                name="location"
                type="text"
                value={formData.location}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="application_deadline" className="form-label">
                Application Deadline *
              </label>
              <input
                id="application_deadline"
                name="application_deadline"
                type="datetime-local"
                value={formData.application_deadline}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="description" className="form-label">
                Description *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={10}
                className="form-textarea"
              />
            </div>

            <div className="form-actions">
              <Link href="/admin/internships" className="cancel-button">
                Cancel
              </Link>
              <button type="submit" disabled={isSubmitting} className="submit-button">
                {isSubmitting ? 'Updating...' : 'Update Internship'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
}





