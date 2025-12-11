'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api';

interface GradeCut {
  등급: number;
  원점수: number | null;
  표준점수: number | null;
  백분위: number | null;
}

const DEFAULT_SUBJECTS = [
  '국어', '수학', '영어', '한국사',
  '생활과윤리', '윤리와사상', '한국지리', '세계지리',
  '동아시아사', '세계사', '경제', '정치와법', '사회문화',
  '물리학Ⅰ', '화학Ⅰ', '생명과학Ⅰ', '지구과학Ⅰ',
  '물리학Ⅱ', '화학Ⅱ', '생명과학Ⅱ', '지구과학Ⅱ',
];

export default function GradecutPage() {
  const [year, setYear] = useState(2026);
  const [model, setModel] = useState('6모');
  const [models, setModels] = useState<string[]>(['6모', '9모', '수능']);
  const [subjects, setSubjects] = useState<string[]>(DEFAULT_SUBJECTS);
  const [selectedSubject, setSelectedSubject] = useState('국어');
  const [cuts, setCuts] = useState<GradeCut[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 등급컷 로드
  const fetchGradeCuts = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/admin/gradecut?year=${year}&model=${model}`);
      const data = await res.json();
      if (data.success) {
        // 과목 목록 업데이트
        const subjectList = Object.keys(data.data);
        if (subjectList.length > 0) {
          setSubjects([...new Set([...DEFAULT_SUBJECTS, ...subjectList])]);
        }
        setModels(data.models.length > 0 ? data.models : ['6모', '9모', '수능']);

        // 선택된 과목의 등급컷 설정
        if (data.data[selectedSubject]) {
          setCuts(data.data[selectedSubject]);
        } else {
          setCuts(getDefaultCuts());
        }
      }
    } catch (error) {
      console.error('Failed to fetch grade cuts:', error);
      setCuts(getDefaultCuts());
    } finally {
      setLoading(false);
    }
  };

  // 기본 등급컷 (빈값)
  const getDefaultCuts = (): GradeCut[] => {
    return [1, 2, 3, 4, 5, 6, 7, 8, 9].map((등급) => ({
      등급,
      원점수: null,
      표준점수: null,
      백분위: null,
    }));
  };

  useEffect(() => {
    fetchGradeCuts();
  }, [year, model]);

  // 과목 변경 시
  const handleSubjectChange = async (subject: string) => {
    setSelectedSubject(subject);
    setLoading(true);
    try {
      const res = await apiFetch(`/api/admin/gradecut?year=${year}&model=${model}`);
      const data = await res.json();
      if (data.success && data.data[subject]) {
        setCuts(data.data[subject]);
      } else {
        setCuts(getDefaultCuts());
      }
    } catch (error) {
      setCuts(getDefaultCuts());
    } finally {
      setLoading(false);
    }
  };

  // 값 변경
  const handleCutChange = (grade: number, field: keyof GradeCut, value: string) => {
    setCuts((prev) =>
      prev.map((cut) =>
        cut.등급 === grade
          ? { ...cut, [field]: value === '' ? null : Number(value) }
          : cut
      )
    );
  };

  // 저장
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiFetch('/api/admin/gradecut', {
        method: 'POST',
        body: JSON.stringify({
          year,
          model,
          subject: selectedSubject,
          cuts,
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
        <h1 className="text-2xl font-bold text-gray-900">예상 등급컷 입력</h1>
        <p className="text-gray-500 mt-1">모의고사/수능 예상 등급컷 설정</p>
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
              <option value={2026}>2026학년도</option>
              <option value={2027}>2027학년도</option>
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
            <select
              value={selectedSubject}
              onChange={(e) => handleSubjectChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg flex-1 max-w-xs"
            >
              {subjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* 등급컷 편집 */}
      <Card>
        <CardHeader>
          <CardTitle>{selectedSubject} 등급컷</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 px-4 text-left font-medium text-gray-600">등급</th>
                    <th className="py-3 px-4 text-center font-medium text-gray-600">원점수</th>
                    <th className="py-3 px-4 text-center font-medium text-gray-600">표준점수</th>
                    <th className="py-3 px-4 text-center font-medium text-gray-600">백분위</th>
                  </tr>
                </thead>
                <tbody>
                  {cuts.map((cut) => (
                    <tr key={cut.등급} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{cut.등급}등급</td>
                      <td className="py-3 px-4">
                        <Input
                          type="number"
                          value={cut.원점수 ?? ''}
                          onChange={(e) => handleCutChange(cut.등급, '원점수', e.target.value)}
                          className="w-24 mx-auto text-center"
                          placeholder="-"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <Input
                          type="number"
                          value={cut.표준점수 ?? ''}
                          onChange={(e) => handleCutChange(cut.등급, '표준점수', e.target.value)}
                          className="w-24 mx-auto text-center"
                          placeholder="-"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <Input
                          type="number"
                          value={cut.백분위 ?? ''}
                          onChange={(e) => handleCutChange(cut.등급, '백분위', e.target.value)}
                          className="w-24 mx-auto text-center"
                          placeholder="-"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end mt-6">
            <Button onClick={handleSave} disabled={saving} size="lg">
              {saving ? '저장 중...' : '저장'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
