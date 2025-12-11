'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';
import { useAuth } from '@/hooks/use-auth';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Zustand hydration 후 인증 상태 확인
    const checkAuth = () => {
      const authState = useAuth.getState();
      if (!authState.isAuthenticated) {
        router.replace('/login');
      } else {
        setIsChecking(false);
      }
    };

    // 약간의 지연 후 체크 (hydration 대기)
    const timer = setTimeout(checkAuth, 100);
    return () => clearTimeout(timer);
  }, [router]);

  // 인증 체크 중에는 로딩 표시
  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-screen-2xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
