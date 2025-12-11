'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api';

interface Student {
  student_id: number;
  student_name: string;
  school_name: string;
}

interface WishlistItem {
  id: number;
  U_ID: number;
  대학명: string;
  학과명: string;
  군: string;
  지역: string;
  suneung_score: number | null;
  silgi_score: number | null;
  total_score: number | null;
  수능: number;
  실기: number;
}

interface FinalApply {
  uid: number;
  대학명: string;
  학과명: string;
  군: string;
  메모: string;
  suneung_score: number | null;
  silgi_score: number | null;
  total_score: number | null;
}

const GROUPS = ['가', '나', '다'];

export default function FinalApplyPage() {
  const [year, setYear] = useState(2026);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [finalApplies, setFinalApplies] = useState<Record<string, FinalApply | null>>({
    가: null,
    나: null,
    다: null,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 학생 목록 조회
  const fetchStudents = async () => {
    try {
      const res = await apiFetch(`/api/students?year=${year}`);
      const data = await res.json();
      if (data.success) {
        setStudents(data.students);
      }
    } catch (error) {
      console.error('Failed to fetch students:', error);
    }
  };

  // 상담 목록 조회
  const fetchWishlist = async (studentId: number) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/counseling/wishlist?student_id=${studentId}&year=${year}`);
      const data = await res.json();
      if (data.success) {
        setWishlist(data.wishlist);
      }
    } catch (error) {
      console.error('Failed to fetch wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  // 최종 지원 조회
  const fetchFinalApplies = async (studentId: number) => {
    try {
      const res = await apiFetch(`/api/final-apply?student_id=${studentId}&year=${year}`);
      const data = await res.json();
      if (data.success) {
        const applies: Record<string, FinalApply | null> = { 가: null, 나: null, 다: null };
        for (const apply of data.finalApplies) {
          if (GROUPS.includes(apply.군)) {
            applies[apply.군] = {
              uid: apply.U_ID,
              대학명: apply.대학명,
              학과명: apply.학과명,
              군: apply.군,
              메모: apply.메모 || '',
              suneung_score: apply.suneung_score,
              silgi_score: apply.silgi_score,
              total_score: apply.total_score,
            };
          }
        }
        setFinalApplies(applies);
      }
    } catch (error) {
      console.error('Failed to fetch final applies:', error);
    }
  };

  // 학생 선택
  const handleSelectStudent = async (student: Student) => {
    setSelectedStudent(student);
    setFinalApplies({ 가: null, 나: null, 다: null });
    await fetchWishlist(student.student_id);
    await fetchFinalApplies(student.student_id);
  };

  // 군에 대학 배정
  const handleAssignGroup = (group: string, item: WishlistItem) => {
    setFinalApplies((prev) => ({
      ...prev,
      [group]: {
        uid: item.U_ID,
        대학명: item.대학명,
        학과명: item.학과명,
        군: group,
        메모: '',
        suneung_score: item.suneung_score,
        silgi_score: item.silgi_score,
        total_score: item.total_score,
      },
    }));
  };

  // 군에서 대학 제거
  const handleRemoveFromGroup = (group: string) => {
    setFinalApplies((prev) => ({
      ...prev,
      [group]: null,
    }));
  };

  // 저장
  const handleSave = async () => {
    if (!selectedStudent) return;

    setSaving(true);
    try {
      const applies = Object.entries(finalApplies)
        .filter(([_, apply]) => apply !== null)
        .map(([group, apply]) => ({
          uid: apply!.uid,
          군: group,
          메모: apply!.메모,
          suneung_score: apply!.suneung_score,
          silgi_score: apply!.silgi_score,
          total_score: apply!.total_score,
        }));

      const res = await apiFetch('/api/final-apply', {
        method: 'POST',
        body: JSON.stringify({
          student_id: selectedStudent.student_id,
          year,
          applies,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert('최종 지원이 저장되었습니다.');
      } else {
        alert(data.message || '저장에 실패했습니다.');
      }
    } catch (error) {
      alert('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [year]);

  // 이미 배정된 대학인지 확인
  const isAssigned = (uid: number) => {
    return Object.values(finalApplies).some((apply) => apply?.uid === uid);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">최종 지원</h1>
          <p className="text-gray-500 mt-1">학생별 최종 지원 대학 선택</p>
        </div>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value={2026}>2026학년도</option>
          <option value={2027}>2027학년도</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 학생 목록 */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>학생 목록</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[600px] overflow-y-auto space-y-1">
              {students.map((student) => (
                <div
                  key={student.student_id}
                  className={`p-3 rounded-lg cursor-pointer ${
                    selectedStudent?.student_id === student.student_id
                      ? 'bg-blue-100 border-blue-300'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleSelectStudent(student)}
                >
                  <div className="font-medium">{student.student_name}</div>
                  <div className="text-sm text-gray-500">{student.school_name || '-'}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 최종 지원 내용 */}
        <div className="lg:col-span-3 space-y-6">
          {selectedStudent ? (
            <>
              {/* 군별 최종 지원 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{selectedStudent.student_name} - 최종 지원</span>
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? '저장 중...' : '저장'}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {GROUPS.map((group) => (
                      <div
                        key={group}
                        className={`p-4 rounded-lg border-2 ${
                          finalApplies[group]
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-dashed border-gray-300'
                        }`}
                      >
                        <div className="font-bold text-lg mb-2">{group}군</div>
                        {finalApplies[group] ? (
                          <div>
                            <div className="font-medium">{finalApplies[group]!.대학명}</div>
                            <div className="text-sm text-gray-600">
                              {finalApplies[group]!.학과명}
                            </div>
                            {finalApplies[group]!.total_score && (
                              <div className="text-sm text-blue-600 mt-1">
                                환산: {finalApplies[group]!.total_score.toFixed(2)}점
                              </div>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-2 text-red-600"
                              onClick={() => handleRemoveFromGroup(group)}
                            >
                              제거
                            </Button>
                          </div>
                        ) : (
                          <div className="text-gray-400 text-sm">
                            아래 목록에서 대학을 선택하세요
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 상담 목록에서 선택 */}
              <Card>
                <CardHeader>
                  <CardTitle>상담 목록에서 선택</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-4 text-gray-500">로딩 중...</div>
                  ) : wishlist.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      상담 목록이 비어있습니다. 먼저 &quot;개인별 상담&quot;에서 대학을 추가해주세요.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {wishlist.map((item) => {
                        const assigned = isAssigned(item.U_ID);
                        return (
                          <div
                            key={item.id}
                            className={`p-3 rounded-lg border flex items-center justify-between ${
                              assigned ? 'bg-gray-100 opacity-50' : 'hover:bg-gray-50'
                            }`}
                          >
                            <div>
                              <div className="font-medium">{item.대학명}</div>
                              <div className="text-sm text-gray-600">
                                {item.학과명} | {item.군}군 | {item.지역}
                              </div>
                              {item.total_score && (
                                <div className="text-sm text-blue-600">
                                  환산: {item.total_score.toFixed(2)}점
                                </div>
                              )}
                            </div>
                            <div className="flex gap-1">
                              {GROUPS.map((group) => (
                                <Button
                                  key={group}
                                  size="sm"
                                  variant={
                                    finalApplies[group]?.uid === item.U_ID ? 'primary' : 'outline'
                                  }
                                  disabled={assigned && finalApplies[group]?.uid !== item.U_ID}
                                  onClick={() => handleAssignGroup(group, item)}
                                >
                                  {group}군
                                </Button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                좌측에서 학생을 선택해주세요.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
