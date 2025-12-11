'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { login } from '@/hooks/use-auth';

export default function LoginPage() {
  const router = useRouter();
  const [userid, setUserid] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(userid, password);

      if (result.success) {
        router.push('/');
      } else {
        setError(result.message || '로그인에 실패했습니다.');
      }
    } catch (err) {
      setError('서버 연결에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4">
          <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center">
            <span className="text-2xl font-bold text-white">MAX</span>
          </div>
        </div>
        <CardTitle className="text-2xl">정시 엔진</CardTitle>
        <p className="text-gray-500 mt-1">로그인하여 시작하세요</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <Input
            id="userid"
            label="아이디"
            type="text"
            value={userid}
            onChange={(e) => setUserid(e.target.value)}
            placeholder="아이디를 입력하세요"
            required
          />

          <Input
            id="password"
            label="비밀번호"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호를 입력하세요"
            required
          />

          <Button
            type="submit"
            className="w-full"
            size="lg"
            loading={loading}
          >
            로그인
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          계정이 없으신가요?{' '}
          <Link
            href="/register"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            회원가입
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
