export interface User {
  id: number;
  email: string;
  role: "admin" | "student";
}

export interface Internship {
  id: number;
  title: string;
  description: string;
  company: string;
  location: string | null;
  application_deadline: string;
  created_at: string;
  created_by: number;
  creator?: User;
}

export interface Application {
  id: number;
  user_id: number;
  internship_id: number;
  cover_letter: string | null;
  status: string | null;
  created_at: string;
  internship?: Internship;
  user?: User;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface CreateInternshipRequest {
  title: string;
  description: string;
  company: string;
  location: string;
  application_deadline: string;
}

export interface UpdateInternshipRequest {
  title?: string;
  description?: string;
  company?: string;
  location?: string;
  application_deadline?: string;
}

export interface CreateApplicationRequest {
  cover_letter?: string;
}

export interface UpdateApplicationRequest {
  status: string;
}


