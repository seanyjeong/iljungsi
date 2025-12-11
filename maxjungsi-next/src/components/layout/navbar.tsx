'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth, logout } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href?: string;
  children?: NavItem[];
  adminOnly?: boolean;
}

const navigation: NavItem[] = [
  { label: '홈', href: '/' },
  {
    label: '학생관리',
    children: [
      { label: '인원추가 및 수정', href: '/students' },
      { label: '학생 가채점 입력', href: '/students/gachaejeom' },
      { label: '학생 성적표 입력', href: '/students/scores' },
    ],
  },
  {
    label: '대학관리',
    children: [
      { label: '전체 점수 계산기', href: '/universities/calculator' },
      { label: '개인별 상담', href: '/universities/counsel' },
    ],
  },
  {
    label: '최종지원',
    children: [
      { label: '최종 지원 수합', href: '/final-apply' },
      { label: '최종 지원LIST(실기일정)', href: '/final-apply/list' },
    ],
  },
  {
    label: 'MAX_LIVE',
    href: '/max-live',
  },
  {
    label: '설정',
    children: [
      { label: '컷 점수 편집기', href: '/settings/cutoffs' },
      { label: '대학점수계산설정', href: '/admin/settings', adminOnly: true },
      { label: '예상 등급컷 입력', href: '/admin/gradecut', adminOnly: true },
      { label: '탐구 변환표준 편집', href: '/admin/inquiry-conv', adminOnly: true },
      { label: '실기배점표수정', href: '/admin/practical', adminOnly: true },
      { label: '엑셀 업로드', href: '/admin/upload', adminOnly: true },
      { label: '엔진 디버거', href: '/admin/debug', adminOnly: true },
    ],
  },
  { label: '전국 등급분포', href: '/settings/grade-distribution' },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const isActive = (href: string) => pathname === href;

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-screen-2xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-sm font-bold text-white">M</span>
            </div>
            <span className="font-semibold text-gray-900">MAX 정시</span>
          </Link>

          {/* Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navigation.map((item) => (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() => item.children && setOpenDropdown(item.label)}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                {item.href ? (
                  <Link
                    href={item.href}
                    className={cn(
                      'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      item.label === 'MAX_LIVE'
                        ? 'text-amber-600 hover:bg-amber-50'
                        : isActive(item.href)
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <button
                    className={cn(
                      'px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1',
                      openDropdown === item.label
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    {item.label}
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                )}

                {/* Dropdown */}
                {item.children && openDropdown === item.label && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[180px]">
                    {item.children
                      .filter((child) => !child.adminOnly || isAdmin())
                      .map((child) => (
                        <Link
                          key={child.href}
                          href={child.href!}
                          className={cn(
                            'block px-4 py-2 text-sm transition-colors',
                            isActive(child.href!)
                              ? 'bg-blue-50 text-blue-600'
                              : 'text-gray-700 hover:bg-gray-50'
                          )}
                        >
                          {child.label}
                        </Link>
                      ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* User Info */}
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{user?.name || user?.userid}</span>
              <span className="text-gray-400 ml-1">({user?.branch})</span>
            </div>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
