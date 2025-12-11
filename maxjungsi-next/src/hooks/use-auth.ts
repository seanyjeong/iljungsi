'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserRole } from '@/types/auth';

interface AuthState {
  isAuthenticated: boolean;
  user: {
    userid: string;
    name: string;
    branch: string;
    role: UserRole;
  } | null;
  token: string | null;
  setAuth: (user: AuthState['user'], token: string) => void;
  clearAuth: () => void;
  isAdmin: () => boolean;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      token: null,

      setAuth: (user, token) => {
        set({
          isAuthenticated: true,
          user,
          token,
        });
      },

      clearAuth: () => {
        set({
          isAuthenticated: false,
          user: null,
          token: null,
        });
      },

      isAdmin: () => {
        return get().user?.userid === 'admin';
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);

// 로그인 함수
export async function login(userid: string, password: string) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userid, password }),
    credentials: 'include',
  });

  const data = await res.json();

  if (data.success && data.user && data.token) {
    useAuth.getState().setAuth(
      {
        userid: data.user.userid,
        name: data.user.name,
        branch: data.user.branch,
        role: data.user.role,
      },
      data.token
    );
  }

  return data;
}

// 로그아웃 함수
export async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  useAuth.getState().clearAuth();
}

// 회원가입 함수
export async function register(data: {
  userid: string;
  password: string;
  name: string;
  position: string;
  branch: string;
  phone: string;
}) {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  return res.json();
}
