'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface StudentWithScore {
  student_id: number;
  student_name: string;
  school_name: string | null;
  gender: 'M' | 'F';
  branch_name: string;
  국어_표점: number | null;
  국어_백분: number | null;
  국어_원점: number | null;
  수학_표점: number | null;
  수학_백분: number | null;
  수학_원점: number | null;
  영어_등급: number | null;
  영어_원점: number | null;
  탐구1_과목: string | null;
  탐구1_표점: number | null;
  탐구1_백분: number | null;
  탐구1_원점: number | null;
  탐구2_과목: string | null;
  탐구2_표점: number | null;
  탐구2_백분: number | null;
  탐구2_원점: number | null;
  한국사_등급: number | null;
  한국사_원점: number | null;
  is_official: number | null;
}

type ScoreField = keyof Omit<StudentWithScore, 'student_id' | 'student_name' | 'school_name' | 'gender' | 'branch_name'>;

export default function ScoresPage() {
  const [year, setYear] = useState(2027);
  const [students, setStudents] = useState<StudentWithScore[]>([]);
  const [editedScores, setEditedScores] = useState<Record<number, Partial<StudentWithScore>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isOfficial, setIsOfficial] = useState(false);

  // 학생 및 성적 조회
  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/students/scores?year=${year}`);
      const data = await res.json();
      if (data.success) {
        setStudents(data.students);
        setEditedScores({});
      }
    } catch (error) {
      console.error('Failed to fetch students:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [year]);

  // 성적 변경 핸들러
  const handleScoreChange = (studentId: number, field: ScoreField, value: string) => {
    setEditedScores((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value === '' ? null : Number(value),
      },
    }));
  };

  // 과목명 변경 핸들러
  const handleSubjectChange = (studentId: number, field: '탐구1_과목' | '탐구2_과목', value: string) => {
    setEditedScores((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value,
      },
    }));
  };

  // 현재 값 가져오기 (수정된 값 또는 원본 값)
  const getValue = (student: StudentWithScore, field: ScoreField): string => {
    const edited = editedScores[student.student_id];
    if (edited && field in edited) {
      const val = edited[field];
      return val === null || val === undefined ? '' : String(val);
    }
    const original = student[field];
    return original === null || original === undefined ? '' : String(original);
  };

  // 저장
  const handleSave = async () => {
    const editedIds = Object.keys(editedScores).map(Number);
    if (editedIds.length === 0) {
      alert('변경된 내용이 없습니다.');
      return;
    }

    // 빈칸이 있는지 확인
    for (const studentId of editedIds) {
      const student = students.find((s) => s.student_id === studentId);
      if (!student) continue;

      const edited = editedScores[studentId];
      const merged = { ...student, ...edited };

      // 주요 필드가 모두 비어있는지 확인
      const hasAnyScore =
        merged.국어_표점 || merged.국어_백분 ||
        merged.수학_표점 || merged.수학_백분 ||
        merged.영어_등급 ||
        merged.탐구1_표점 || merged.탐구1_백분 ||
        merged.탐구2_표점 || merged.탐구2_백분 ||
        merged.한국사_등급;

      if (!hasAnyScore) {
        const confirmEmpty = confirm(
          `${student.student_name} 학생의 성적이 모두 비어있습니다. 저장하시겠습니까?`
        );
        if (!confirmEmpty) return;
      }
    }

    setSaving(true);
    try {
      const scores = editedIds.map((studentId) => {
        const student = students.find((s) => s.student_id === studentId);
        const edited = editedScores[studentId];
        return {
          student_id: studentId,
          ...student,
          ...edited,
        };
      });

      const res = await fetch('/api/students/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scores, year, is_official: isOfficial }),
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchStudents();
      } else {
        alert(data.message || '저장에 실패했습니다.');
      }
    } catch (error) {
      alert('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // 변경된 학생 수
  const editedCount = Object.keys(editedScores).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">성적 입력</h1>
          <p className="text-gray-500 mt-1">학생별 수능/모의고사 성적 입력</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value={2027}>2027학년도</option>
            <option value={2026}>2026학년도</option>
          </select>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isOfficial}
              onChange={(e) => setIsOfficial(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm">공식 성적</span>
          </label>
          <Button onClick={handleSave} disabled={saving || editedCount === 0}>
            {saving ? '저장 중...' : `저장 (${editedCount}명)`}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>성적 입력표</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : students.length === 0 ? (
            <div className="text-center py-8 text-gray-500">학생이 없습니다.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-2 py-3 text-left font-medium text-gray-600 whitespace-nowrap">
                      이름
                    </th>
                    <th className="px-2 py-3 text-center font-medium text-gray-600" colSpan={3}>
                      국어
                    </th>
                    <th className="px-2 py-3 text-center font-medium text-gray-600" colSpan={3}>
                      수학
                    </th>
                    <th className="px-2 py-3 text-center font-medium text-gray-600" colSpan={2}>
                      영어
                    </th>
                    <th className="px-2 py-3 text-center font-medium text-gray-600" colSpan={4}>
                      탐구1
                    </th>
                    <th className="px-2 py-3 text-center font-medium text-gray-600" colSpan={4}>
                      탐구2
                    </th>
                    <th className="px-2 py-3 text-center font-medium text-gray-600" colSpan={2}>
                      한국사
                    </th>
                  </tr>
                  <tr className="bg-gray-100">
                    <th className="px-2 py-1 text-left text-xs text-gray-500"></th>
                    <th className="px-2 py-1 text-center text-xs text-gray-500">표점</th>
                    <th className="px-2 py-1 text-center text-xs text-gray-500">백분</th>
                    <th className="px-2 py-1 text-center text-xs text-gray-500">원점</th>
                    <th className="px-2 py-1 text-center text-xs text-gray-500">표점</th>
                    <th className="px-2 py-1 text-center text-xs text-gray-500">백분</th>
                    <th className="px-2 py-1 text-center text-xs text-gray-500">원점</th>
                    <th className="px-2 py-1 text-center text-xs text-gray-500">등급</th>
                    <th className="px-2 py-1 text-center text-xs text-gray-500">원점</th>
                    <th className="px-2 py-1 text-center text-xs text-gray-500">과목</th>
                    <th className="px-2 py-1 text-center text-xs text-gray-500">표점</th>
                    <th className="px-2 py-1 text-center text-xs text-gray-500">백분</th>
                    <th className="px-2 py-1 text-center text-xs text-gray-500">원점</th>
                    <th className="px-2 py-1 text-center text-xs text-gray-500">과목</th>
                    <th className="px-2 py-1 text-center text-xs text-gray-500">표점</th>
                    <th className="px-2 py-1 text-center text-xs text-gray-500">백분</th>
                    <th className="px-2 py-1 text-center text-xs text-gray-500">원점</th>
                    <th className="px-2 py-1 text-center text-xs text-gray-500">등급</th>
                    <th className="px-2 py-1 text-center text-xs text-gray-500">원점</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const isEdited = editedScores[student.student_id] !== undefined;
                    return (
                      <tr
                        key={student.student_id}
                        className={`border-b ${isEdited ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}
                      >
                        <td className="px-2 py-2 font-medium whitespace-nowrap">
                          {student.student_name}
                        </td>
                        {/* 국어 */}
                        <td className="px-1 py-1">
                          <Input
                            type="number"
                            value={getValue(student, '국어_표점')}
                            onChange={(e) =>
                              handleScoreChange(student.student_id, '국어_표점', e.target.value)
                            }
                            className="w-14 text-center text-sm px-1"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <Input
                            type="number"
                            value={getValue(student, '국어_백분')}
                            onChange={(e) =>
                              handleScoreChange(student.student_id, '국어_백분', e.target.value)
                            }
                            className="w-14 text-center text-sm px-1"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <Input
                            type="number"
                            value={getValue(student, '국어_원점')}
                            onChange={(e) =>
                              handleScoreChange(student.student_id, '국어_원점', e.target.value)
                            }
                            className="w-14 text-center text-sm px-1"
                          />
                        </td>
                        {/* 수학 */}
                        <td className="px-1 py-1">
                          <Input
                            type="number"
                            value={getValue(student, '수학_표점')}
                            onChange={(e) =>
                              handleScoreChange(student.student_id, '수학_표점', e.target.value)
                            }
                            className="w-14 text-center text-sm px-1"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <Input
                            type="number"
                            value={getValue(student, '수학_백분')}
                            onChange={(e) =>
                              handleScoreChange(student.student_id, '수학_백분', e.target.value)
                            }
                            className="w-14 text-center text-sm px-1"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <Input
                            type="number"
                            value={getValue(student, '수학_원점')}
                            onChange={(e) =>
                              handleScoreChange(student.student_id, '수학_원점', e.target.value)
                            }
                            className="w-14 text-center text-sm px-1"
                          />
                        </td>
                        {/* 영어 */}
                        <td className="px-1 py-1">
                          <select
                            value={getValue(student, '영어_등급') || ''}
                            onChange={(e) =>
                              handleScoreChange(student.student_id, '영어_등급', e.target.value)
                            }
                            className="w-14 px-1 py-1 border border-gray-300 rounded text-sm"
                          >
                            <option value="">-</option>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((g) => (
                              <option key={g} value={g}>
                                {g}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-1 py-1">
                          <Input
                            type="number"
                            value={getValue(student, '영어_원점')}
                            onChange={(e) =>
                              handleScoreChange(student.student_id, '영어_원점', e.target.value)
                            }
                            className="w-14 text-center text-sm px-1"
                          />
                        </td>
                        {/* 탐구1 */}
                        <td className="px-1 py-1">
                          <Input
                            type="text"
                            value={getValue(student, '탐구1_과목' as ScoreField)}
                            onChange={(e) =>
                              handleSubjectChange(student.student_id, '탐구1_과목', e.target.value)
                            }
                            placeholder="과목"
                            className="w-16 text-sm px-1"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <Input
                            type="number"
                            value={getValue(student, '탐구1_표점')}
                            onChange={(e) =>
                              handleScoreChange(student.student_id, '탐구1_표점', e.target.value)
                            }
                            className="w-14 text-center text-sm px-1"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <Input
                            type="number"
                            value={getValue(student, '탐구1_백분')}
                            onChange={(e) =>
                              handleScoreChange(student.student_id, '탐구1_백분', e.target.value)
                            }
                            className="w-14 text-center text-sm px-1"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <Input
                            type="number"
                            value={getValue(student, '탐구1_원점')}
                            onChange={(e) =>
                              handleScoreChange(student.student_id, '탐구1_원점', e.target.value)
                            }
                            className="w-14 text-center text-sm px-1"
                          />
                        </td>
                        {/* 탐구2 */}
                        <td className="px-1 py-1">
                          <Input
                            type="text"
                            value={getValue(student, '탐구2_과목' as ScoreField)}
                            onChange={(e) =>
                              handleSubjectChange(student.student_id, '탐구2_과목', e.target.value)
                            }
                            placeholder="과목"
                            className="w-16 text-sm px-1"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <Input
                            type="number"
                            value={getValue(student, '탐구2_표점')}
                            onChange={(e) =>
                              handleScoreChange(student.student_id, '탐구2_표점', e.target.value)
                            }
                            className="w-14 text-center text-sm px-1"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <Input
                            type="number"
                            value={getValue(student, '탐구2_백분')}
                            onChange={(e) =>
                              handleScoreChange(student.student_id, '탐구2_백분', e.target.value)
                            }
                            className="w-14 text-center text-sm px-1"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <Input
                            type="number"
                            value={getValue(student, '탐구2_원점')}
                            onChange={(e) =>
                              handleScoreChange(student.student_id, '탐구2_원점', e.target.value)
                            }
                            className="w-14 text-center text-sm px-1"
                          />
                        </td>
                        {/* 한국사 */}
                        <td className="px-1 py-1">
                          <select
                            value={getValue(student, '한국사_등급') || ''}
                            onChange={(e) =>
                              handleScoreChange(student.student_id, '한국사_등급', e.target.value)
                            }
                            className="w-14 px-1 py-1 border border-gray-300 rounded text-sm"
                          >
                            <option value="">-</option>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((g) => (
                              <option key={g} value={g}>
                                {g}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-1 py-1">
                          <Input
                            type="number"
                            value={getValue(student, '한국사_원점')}
                            onChange={(e) =>
                              handleScoreChange(student.student_id, '한국사_원점', e.target.value)
                            }
                            className="w-14 text-center text-sm px-1"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
