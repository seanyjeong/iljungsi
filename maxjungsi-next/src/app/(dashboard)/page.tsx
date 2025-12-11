'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';

const quickLinks = [
  {
    title: '학생 관리',
    description: '학생 추가, 수정, 삭제',
    href: '/students',
    icon: '👥',
  },
  {
    title: '가채점 입력',
    description: '수능 가채점 성적 입력',
    href: '/students/gachaejeom',
    icon: '📝',
  },
  {
    title: '성적표 입력',
    description: '수능 실채점 성적 입력',
    href: '/students/scores',
    icon: '📊',
  },
  {
    title: '점수 계산기',
    description: '대학별 점수 계산',
    href: '/universities/calculator',
    icon: '🔢',
  },
  {
    title: '개인별 상담',
    description: '학생별 상담 및 PDF 생성',
    href: '/universities/counsel',
    icon: '💬',
  },
  {
    title: '최종 지원',
    description: '최종 지원 현황 관리',
    href: '/final-apply',
    icon: '🎯',
  },
];

export default function HomePage() {
  const { user, isAdmin } = useAuth();

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          안녕하세요, {user?.name || user?.userid}님!
        </h1>
        <p className="text-gray-500 mt-1">
          MAX 정시 엔진에 오신 것을 환영합니다.
        </p>
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">빠른 접근</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="text-3xl">{link.icon}</div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {link.title}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {link.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Admin Section */}
      {isAdmin() && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            관리자 도구
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/admin/settings">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">⚙️</span>
                    <span className="font-medium">점수 계산 설정</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/admin/upload">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📤</span>
                    <span className="font-medium">엑셀 업로드</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/admin/gradecut">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📈</span>
                    <span className="font-medium">등급컷 입력</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/admin/debug">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🔧</span>
                    <span className="font-medium">디버거</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">지점</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{user?.branch}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">현재 연도</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">2027</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">역할</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">
              {user?.role === 'admin' ? '관리자' : '원장'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
