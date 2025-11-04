# InternHub Frontend

Next.js frontend application for InternHub - an internship management platform.

## Features

- 🔐 JWT-based authentication with automatic token refresh
- 👥 Role-based access control (Student & Admin)
- 📚 Internship browsing and management
- 📝 Application submission and tracking
- 🎨 Modern, responsive UI with CSS styling
- ⚡ Optimized data fetching (only loads data when needed)
- 🔄 Proper browser navigation (back/forward buttons work)

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **React 18**
- **Axios** for API calls
- **CSS** for styling

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Backend server running on `http://localhost:8000`

### Installation

1. Install dependencies:
```bash
npm install
```

2. The environment variables are already configured in `.env.local`:
   - `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v2`
   - `NEXT_PUBLIC_API_HEALTH_URL=http://localhost:8000/healthz`

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Default Login Credentials

- **Admin**: 
  - Email: `admin@internhub.local`
  - Password: `ChangeMe123!`

## Project Structure

```
frontend/
├── app/                    # Next.js App Router pages
│   ├── login/             # Login page
│   ├── internships/       # Internship listing and details
│   ├── applications/      # Student applications page
│   └── admin/             # Admin dashboard pages
├── components/            # Reusable React components
├── contexts/              # React contexts (Auth)
├── lib/                   # API client and utilities
├── types/                 # TypeScript type definitions
└── package.json
```

## Pages & Routes

### Public Routes
- `/` - Redirects to login or internships based on auth status
- `/login` - Sign in page

### Student Routes
- `/internships` - Browse all available internships
- `/internships/[id]` - View internship details and apply
- `/applications` - View own applications

### Admin Routes
- `/internships` - Browse all internships
- `/internships/[id]` - View internship details
- `/admin/internships` - Manage own created internships
- `/admin/create` - Create new internship
- `/admin/internships/[id]/edit` - Edit internship
- `/admin/internships/[id]/applications` - View and manage applications

## Features Explained

### Authentication
- Access tokens stored in memory (secure)
- Refresh tokens stored in localStorage
- Automatic token refresh on 401 errors
- Automatic redirect to login on auth failure

### Data Fetching
- Data is fetched only when needed (on page load)
- Pagination implemented for list endpoints
- No unnecessary API calls
- Proper loading states

### Browser Navigation
- Uses Next.js App Router for proper routing
- Browser back/forward buttons work correctly
- Each route loads independently

### Role-Based Access
- Protected routes check user role
- Student-only and Admin-only pages
- Automatic redirects for unauthorized access

## API Integration

The frontend connects to the backend API at `http://localhost:8000/api/v2`.

### Key Features:
- Automatic token injection in requests
- Token refresh on expiration
- Error handling with user-friendly messages
- CORS configured for `http://localhost:3000`

## Development

### Build for Production

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

## Environment Variables

Create a `.env.local` file (already included) with:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v2
NEXT_PUBLIC_API_HEALTH_URL=http://localhost:8000/healthz
```

If your backend runs on a different port or your frontend on a different port, update these accordingly.

## Troubleshooting

### CORS Errors
If you see CORS errors, ensure:
1. Backend CORS is configured to allow `http://localhost:3000`
2. Check backend `.env` file for `CORS_ORIGINS`

### Authentication Issues
- Check that tokens are being stored correctly
- Verify backend is running and accessible
- Check browser console for detailed errors

### API Connection Issues
- Verify backend is running on port 8000
- Check network tab in browser DevTools
- Test backend health endpoint: `http://localhost:8000/healthz`

## Notes

- All data is fetched on-demand (no pre-loading)
- Each page is a separate route (proper browser navigation)
- CSS files are included for every TypeScript component
- TypeScript types match backend API responses


