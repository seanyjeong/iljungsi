export type UserRole = 'admin' | 'owner' | 'teacher' | 'student';

export interface JWTPayload {
  userid: string;
  branch: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface User {
  id: number;
  userid: string;
  name: string;
  branch: string;
  role: UserRole;
  phone?: string;
  position?: string;
  approved: boolean;
}

export interface LoginRequest {
  userid: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: Omit<User, 'id'>;
  message?: string;
}

export interface RegisterRequest {
  userid: string;
  password: string;
  name: string;
  position: string;
  branch: string;
  phone: string;
}
