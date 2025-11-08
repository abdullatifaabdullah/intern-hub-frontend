'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { apiClient, formatApiError } from '@/lib/api';
import './page.css';

export default function CreateInternshipPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    company: '',
    location: '',
    application_deadline: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      await apiClient.createInternship({
        ...formData,
        application_deadline: new Date(formData.application_deadline).toISOString(),
      });
      router.push('/admin/internships');
    } catch (err: any) {
      setError(formatApiError(err) || 'Failed to create internship');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get minimum date (today)
  const minDate = new Date().toISOString().split('T')[0];

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="create-internship-page">
        <Navbar />
        <div className="create-container">
          <Link href="/admin/internships" className="back-link">
            ← Back to My Internships
          </Link>

          <h1 className="page-title">Create New Internship</h1>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit} className="create-form">
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
                placeholder="e.g., Software Engineering Intern"
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
                placeholder="e.g., Tech Corp"
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
                placeholder="e.g., Remote, New York, NY"
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
                min={minDate}
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
                placeholder="Describe the internship position, requirements, responsibilities, etc."
              />
            </div>

            <div className="form-actions">
              <Link href="/admin/internships" className="cancel-button">
                Cancel
              </Link>
              <button type="submit" disabled={isSubmitting} className="submit-button">
                {isSubmitting ? 'Creating...' : 'Create Internship'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
}





