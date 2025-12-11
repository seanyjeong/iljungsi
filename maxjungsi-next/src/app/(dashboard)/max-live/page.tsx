'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface University {
  U_ID: number;
  대학명: string;
  학과명: string;
  군: string;
}

interface Applicant {
  student_id: number;
  name: string;
  school_name: string;
  branch: string;
  scores: {
    korean: { standard: number; percentile: number };
    math: { standard: number; percentile: number };
    english: { grade: number };
    inquiry1: { subject: string; standard: number; percentile: number };
    inquiry2: { subject: string; standard: number; percentile: number };
    history: { grade: number };
  };
  suneung_score: number;
  practical_score: number;
  practical_records: Record<string, string> | null;
  total_score: number;
}

interface Stats {
  total_count: number;
  avg_score: number;
  max_score: number;
  min_score: number;
}

export default function MaxLivePage() {
  const [year, setYear] = useState(2027);
  const [searchTerm, setSearchTerm] = useState('');
  const [universities, setUniversities] = useState<University[]>([]);
  const [selectedUniv, setSelectedUniv] = useState<University | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);

  // 대학 검색
  const searchUniversities = async () => {
    if (!searchTerm.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/universities?year=${year}&search=${encodeURIComponent(searchTerm)}`);
      const data = await res.json();
      if (data.success) {
        setUniversities(data.universities);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // 지원자 조회
  const fetchApplicants = async (univ: University) => {
    setSelectedUniv(univ);
    setLoading(true);
    try {
      const res = await fetch(`/api/universities/applicants?uid=${univ.U_ID}&year=${year}`);
      const data = await res.json();
      if (data.success) {
        setApplicants(data.applicants);
        setStats(data.stats);
      } else {
        setApplicants([]);
        setStats(null);
      }
    } catch (error) {
      console.error('Fetch applicants failed:', error);
      setApplicants([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">MAX LIVE</h1>
          <p className="text-gray-500 mt-1">학교별 지원자 현황</p>
        </div>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value={2027}>2027학년도</option>
          <option value={2026}>2026학년도</option>
        </select>
      </div>

      {/* 대학 검색 */}
      <Card>
        <CardHeader>
          <CardTitle>대학 검색</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="대학명 또는 학과명 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchUniversities()}
              className="flex-1"
            />
            <Button onClick={searchUniversities} disabled={loading}>
              검색
            </Button>
          </div>

          {universities.length > 0 && (
            <div className="mt-4 max-h-60 overflow-y-auto border rounded-lg">
              {universities.map((univ) => (
                <div
                  key={univ.U_ID}
                  className={`p-3 border-b cursor-pointer hover:bg-gray-50 flex justify-between items-center ${
                    selectedUniv?.U_ID === univ.U_ID ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => fetchApplicants(univ)}
                >
                  <div>
                    <span className="font-medium">{univ.대학명}</span>
                    <span className="text-gray-500 ml-2">{univ.학과명}</span>
                  </div>
                  <span className="px-2 py-1 bg-gray-100 rounded text-sm">{univ.군}군</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 선택된 대학 정보 */}
      {selectedUniv && (
        <>
          {/* 통계 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-blue-600">{stats?.total_count || 0}</div>
                <div className="text-sm text-gray-500 mt-1">총 지원자</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-green-600">
                  {stats?.avg_score?.toFixed(2) || '-'}
                </div>
                <div className="text-sm text-gray-500 mt-1">평균 점수</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {stats?.max_score?.toFixed(2) || '-'}
                </div>
                <div className="text-sm text-gray-500 mt-1">최고 점수</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-orange-600">
                  {stats?.min_score?.toFixed(2) || '-'}
                </div>
                <div className="text-sm text-gray-500 mt-1">최저 점수</div>
              </CardContent>
            </Card>
          </div>

          {/* 지원자 목록 */}
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedUniv.대학명} - {selectedUniv.학과명} 지원자 ({applicants.length}명)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-gray-500">로딩 중...</div>
              ) : applicants.length === 0 ? (
                <div className="text-center py-8 text-gray-500">지원자가 없습니다.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                      <tr>
                        <th className="py-3 px-2 text-center">#</th>
                        <th className="py-3 px-2 text-left">이름</th>
                        <th className="py-3 px-2 text-left">학교</th>
                        <th className="py-3 px-2 text-center">지점</th>
                        <th className="py-3 px-2 text-center">국어</th>
                        <th className="py-3 px-2 text-center">수학</th>
                        <th className="py-3 px-2 text-center">영어</th>
                        <th className="py-3 px-2 text-center">탐구1</th>
                        <th className="py-3 px-2 text-center">탐구2</th>
                        <th className="py-3 px-2 text-center">한국사</th>
                        <th className="py-3 px-2 text-center">수능점수</th>
                        <th className="py-3 px-2 text-center">실기점수</th>
                        <th className="py-3 px-2 text-center font-bold">총점</th>
                      </tr>
                    </thead>
                    <tbody>
                      {applicants.map((applicant, idx) => (
                        <tr
                          key={applicant.student_id}
                          className={`border-b hover:bg-gray-50 ${idx === 0 ? 'bg-yellow-50' : ''}`}
                        >
                          <td className="py-3 px-2 text-center font-medium">{idx + 1}</td>
                          <td className="py-3 px-2 font-medium">{applicant.name}</td>
                          <td className="py-3 px-2 text-gray-600">{applicant.school_name || '-'}</td>
                          <td className="py-3 px-2 text-center">
                            <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                              {applicant.branch}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-center">
                            {applicant.scores.korean.standard}/{applicant.scores.korean.percentile}
                          </td>
                          <td className="py-3 px-2 text-center">
                            {applicant.scores.math.standard}/{applicant.scores.math.percentile}
                          </td>
                          <td className="py-3 px-2 text-center">{applicant.scores.english.grade}등급</td>
                          <td className="py-3 px-2 text-center">
                            <span className="text-xs text-gray-400">
                              {applicant.scores.inquiry1.subject}
                            </span>
                            <br />
                            {applicant.scores.inquiry1.standard}/{applicant.scores.inquiry1.percentile}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span className="text-xs text-gray-400">
                              {applicant.scores.inquiry2.subject}
                            </span>
                            <br />
                            {applicant.scores.inquiry2.standard}/{applicant.scores.inquiry2.percentile}
                          </td>
                          <td className="py-3 px-2 text-center">{applicant.scores.history.grade}등급</td>
                          <td className="py-3 px-2 text-center text-blue-600">
                            {applicant.suneung_score.toFixed(2)}
                          </td>
                          <td className="py-3 px-2 text-center text-green-600">
                            {applicant.practical_score.toFixed(2)}
                          </td>
                          <td className="py-3 px-2 text-center font-bold text-purple-600">
                            {applicant.total_score.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
