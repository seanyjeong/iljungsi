'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { register } from '@/hooks/use-auth';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    userid: '',
    password: '',
    passwordConfirm: '',
    name: '',
    position: '',
    branch: '',
    phone: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 비밀번호 확인
    if (formData.password !== formData.passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    setLoading(true);

    try {
      const result = await register({
        userid: formData.userid,
        password: formData.password,
        name: formData.name,
        position: formData.position,
        branch: formData.branch,
        phone: formData.phone,
      });

      if (result.success) {
        alert('회원가입이 완료되었습니다. 관리자 승인 후 로그인할 수 있습니다.');
        router.push('/login');
      } else {
        setError(result.message || '회원가입에 실패했습니다.');
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
        <CardTitle className="text-2xl">회원가입</CardTitle>
        <p className="text-gray-500 mt-1">정시 엔진 계정을 만드세요</p>
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
            name="userid"
            label="아이디"
            type="text"
            value={formData.userid}
            onChange={handleChange}
            placeholder="아이디를 입력하세요"
            required
          />

          <Input
            id="password"
            name="password"
            label="비밀번호"
            type="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="비밀번호를 입력하세요"
            required
          />

          <Input
            id="passwordConfirm"
            name="passwordConfirm"
            label="비밀번호 확인"
            type="password"
            value={formData.passwordConfirm}
            onChange={handleChange}
            placeholder="비밀번호를 다시 입력하세요"
            required
          />

          <Input
            id="name"
            name="name"
            label="이름"
            type="text"
            value={formData.name}
            onChange={handleChange}
            placeholder="이름을 입력하세요"
            required
          />

          <Input
            id="position"
            name="position"
            label="직급"
            type="text"
            value={formData.position}
            onChange={handleChange}
            placeholder="직급을 입력하세요"
          />

          <Input
            id="branch"
            name="branch"
            label="지점명"
            type="text"
            value={formData.branch}
            onChange={handleChange}
            placeholder="지점명을 입력하세요"
            required
          />

          <Input
            id="phone"
            name="phone"
            label="전화번호"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            placeholder="전화번호를 입력하세요"
          />

          <Button
            type="submit"
            className="w-full"
            size="lg"
            loading={loading}
          >
            회원가입
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          이미 계정이 있으신가요?{' '}
          <Link
            href="/login"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            로그인
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
