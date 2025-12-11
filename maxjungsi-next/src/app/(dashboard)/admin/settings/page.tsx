'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface University {
  U_ID: number;
  대학명: string;
  학과명: string;
}

export default function AdminSettingsPage() {
  const [year, setYear] = useState(2027);
  const [search, setSearch] = useState('');
  const [universities, setUniversities] = useState<University[]>([]);
  const [selectedUniv, setSelectedUniv] = useState<University | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 점수표 데이터
  const [englishScores, setEnglishScores] = useState<Record<string, number>>({});
  const [historyScores, setHistoryScores] = useState<Record<string, number>>({});

  // 대학 검색
  const searchUniversities = async () => {
    if (!search.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/universities?year=${year}&search=${encodeURIComponent(search)}`);
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

  // 대학 선택 시 설정 로드
  const handleSelectUniversity = async (univ: University) => {
    setSelectedUniv(univ);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/settings?uid=${univ.U_ID}&year=${year}`);
      const data = await res.json();
      if (data.success) {
        setEnglishScores(data.data.englishScores || getDefaultEnglishScores());
        setHistoryScores(data.data.historyScores || getDefaultHistoryScores());
      } else {
        setEnglishScores(getDefaultEnglishScores());
        setHistoryScores(getDefaultHistoryScores());
      }
    } catch (error) {
      console.error('Load settings failed:', error);
      setEnglishScores(getDefaultEnglishScores());
      setHistoryScores(getDefaultHistoryScores());
    } finally {
      setLoading(false);
    }
  };

  // 기본 영어 점수표
  const getDefaultEnglishScores = () => ({
    '1': 100, '2': 95, '3': 90, '4': 85, '5': 80,
    '6': 75, '7': 70, '8': 65, '9': 60,
  });

  // 기본 한국사 점수표
  const getDefaultHistoryScores = () => ({
    '1': 10, '2': 10, '3': 10, '4': 9.5, '5': 9,
    '6': 8.5, '7': 8, '8': 7.5, '9': 7,
  });

  // 저장
  const handleSave = async () => {
    if (!selectedUniv) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: selectedUniv.U_ID,
          year,
          englishScores,
          historyScores,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('저장되었습니다.');
      } else {
        alert(data.message || '저장에 실패했습니다.');
      }
    } catch (error) {
      alert('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">영어/한국사 점수표 설정</h1>
        <p className="text-gray-500 mt-1">대학별 등급별 환산 점수 설정</p>
      </div>

      {/* 검색 */}
      <Card>
        <CardHeader>
          <CardTitle>대학 검색</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value={2027}>2027학년도</option>
              <option value={2026}>2026학년도</option>
            </select>
            <Input
              placeholder="대학명 또는 학과명..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchUniversities()}
              className="flex-1"
            />
            <Button onClick={searchUniversities} disabled={loading}>
              검색
            </Button>
          </div>

          {universities.length > 0 && (
            <div className="mt-4 max-h-40 overflow-y-auto border rounded-lg">
              {universities.map((univ) => (
                <div
                  key={univ.U_ID}
                  className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${
                    selectedUniv?.U_ID === univ.U_ID ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleSelectUniversity(univ)}
                >
                  <span className="font-medium">{univ.대학명}</span>
                  <span className="text-gray-500 ml-2">{univ.학과명}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 점수표 편집 */}
      {selectedUniv && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 영어 점수표 */}
          <Card>
            <CardHeader>
              <CardTitle>영어 등급별 점수</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((grade) => (
                  <div key={grade} className="flex items-center gap-4">
                    <span className="w-16 font-medium">{grade}등급</span>
                    <Input
                      type="number"
                      value={englishScores[String(grade)] || 0}
                      onChange={(e) =>
                        setEnglishScores({
                          ...englishScores,
                          [String(grade)]: Number(e.target.value),
                        })
                      }
                      className="w-24"
                    />
                    <span className="text-gray-500">점</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 한국사 점수표 */}
          <Card>
            <CardHeader>
              <CardTitle>한국사 등급별 점수</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((grade) => (
                  <div key={grade} className="flex items-center gap-4">
                    <span className="w-16 font-medium">{grade}등급</span>
                    <Input
                      type="number"
                      step="0.1"
                      value={historyScores[String(grade)] || 0}
                      onChange={(e) =>
                        setHistoryScores({
                          ...historyScores,
                          [String(grade)]: Number(e.target.value),
                        })
                      }
                      className="w-24"
                    />
                    <span className="text-gray-500">점</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 저장 버튼 */}
      {selectedUniv && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? '저장 중...' : '저장'}
          </Button>
        </div>
      )}
    </div>
  );
}
