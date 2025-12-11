'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface HighestScore {
  과목명: string;
  최고점: number | null;
}

const DEFAULT_SUBJECTS = [
  '국어', '수학',
  '생활과윤리', '윤리와사상', '한국지리', '세계지리',
  '동아시아사', '세계사', '경제', '정치와법', '사회문화',
  '물리학Ⅰ', '화학Ⅰ', '생명과학Ⅰ', '지구과학Ⅰ',
  '물리학Ⅱ', '화학Ⅱ', '생명과학Ⅱ', '지구과학Ⅱ',
];

export default function HighestScorePage() {
  const [year, setYear] = useState(2027);
  const [model, setModel] = useState('6모');
  const [models, setModels] = useState<string[]>(['6모', '9모', '수능']);
  const [scores, setScores] = useState<HighestScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 최고표점 로드
  const fetchHighestScores = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/highest-score?year=${year}&model=${model}`);
      const data = await res.json();
      if (data.success) {
        // 기본 과목 목록에 DB 데이터 병합
        const dbScores = data.data as HighestScore[];
        const mergedScores = DEFAULT_SUBJECTS.map((subject) => {
          const found = dbScores.find((s) => s.과목명 === subject);
          return found || { 과목명: subject, 최고점: null };
        });
        setScores(mergedScores);
        setModels(data.models.length > 0 ? data.models : ['6모', '9모', '수능']);
      } else {
        setScores(DEFAULT_SUBJECTS.map((s) => ({ 과목명: s, 최고점: null })));
      }
    } catch (error) {
      console.error('Failed to fetch highest scores:', error);
      setScores(DEFAULT_SUBJECTS.map((s) => ({ 과목명: s, 최고점: null })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHighestScores();
  }, [year, model]);

  // 값 변경
  const handleScoreChange = (subject: string, value: string) => {
    setScores((prev) =>
      prev.map((s) =>
        s.과목명 === subject
          ? { ...s, 최고점: value === '' ? null : Number(value) }
          : s
      )
    );
  };

  // 저장
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/highest-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year,
          model,
          scores: scores.filter((s) => s.최고점 !== null),
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

  // 과목 그룹화
  const groupedSubjects = {
    공통: ['국어', '수학'],
    사탐: ['생활과윤리', '윤리와사상', '한국지리', '세계지리', '동아시아사', '세계사', '경제', '정치와법', '사회문화'],
    과탐: ['물리학Ⅰ', '화학Ⅰ', '생명과학Ⅰ', '지구과학Ⅰ', '물리학Ⅱ', '화학Ⅱ', '생명과학Ⅱ', '지구과학Ⅱ'],
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">최고표점 설정</h1>
        <p className="text-gray-500 mt-1">모의고사/수능 과목별 최고 표준점수 설정</p>
      </div>

      {/* 필터 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value={2027}>2027학년도</option>
              <option value={2026}>2026학년도</option>
            </select>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* 최고표점 편집 */}
      {loading ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            로딩 중...
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(groupedSubjects).map(([group, subjects]) => (
            <Card key={group}>
              <CardHeader>
                <CardTitle>{group} 과목</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {subjects.map((subject) => {
                    const score = scores.find((s) => s.과목명 === subject);
                    return (
                      <div key={subject} className="flex items-center gap-3">
                        <span className="w-24 text-sm font-medium truncate" title={subject}>
                          {subject}
                        </span>
                        <Input
                          type="number"
                          value={score?.최고점 ?? ''}
                          onChange={(e) => handleScoreChange(subject, e.target.value)}
                          className="w-20 text-center"
                          placeholder="-"
                        />
                        <span className="text-gray-500 text-sm">점</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 저장 버튼 */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? '저장 중...' : '저장'}
        </Button>
      </div>
    </div>
  );
}
