'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { generateCounselPDF } from '@/lib/pdf-generator';
import { apiFetch } from '@/lib/api';

interface Student {
  student_id: number;
  student_name: string;
  school_name: string;
  gender: 'M' | 'F';
  branch_name: string;
}

interface WishlistItem {
  id: number;
  U_ID: number;
  대학명: string;
  학과명: string;
  군: string;
  지역: string;
  priority: number;
  memo: string;
  suneung_score: number | null;
  silgi_score: number | null;
  total_score: number | null;
  수능: number;
  내신: number;
  실기: number;
}

interface ScoreData {
  국어_표점: number;
  국어_백분: number;
  수학_표점: number;
  수학_백분: number;
  영어_등급: number;
  탐구1_과목: string;
  탐구1_표점: number;
  탐구1_백분: number;
  탐구2_과목: string;
  탐구2_표점: number;
  탐구2_백분: number;
  한국사_등급: number;
}

export default function CounselPage() {
  const [year, setYear] = useState(2026);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentScore, setStudentScore] = useState<ScoreData | null>(null);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(false);

  // 대학 추가 모달
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [generatingPDF, setGeneratingPDF] = useState(false);

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

  // 학생 성적 조회
  const fetchStudentScore = async (studentId: number) => {
    try {
      const res = await apiFetch(`/api/students/scores?year=${year}&student_ids=${studentId}`);
      const data = await res.json();
      if (data.success && data.students.length > 0) {
        const s = data.students[0];
        setStudentScore({
          국어_표점: s.국어_표점 || 0,
          국어_백분: s.국어_백분 || 0,
          수학_표점: s.수학_표점 || 0,
          수학_백분: s.수학_백분 || 0,
          영어_등급: s.영어_등급 || 9,
          탐구1_과목: s.탐구1_과목 || '',
          탐구1_표점: s.탐구1_표점 || 0,
          탐구1_백분: s.탐구1_백분 || 0,
          탐구2_과목: s.탐구2_과목 || '',
          탐구2_표점: s.탐구2_표점 || 0,
          탐구2_백분: s.탐구2_백분 || 0,
          한국사_등급: s.한국사_등급 || 9,
        });
      }
    } catch (error) {
      console.error('Failed to fetch score:', error);
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

  // 학생 선택
  const handleSelectStudent = async (student: Student) => {
    setSelectedStudent(student);
    setWishlist([]);
    await fetchStudentScore(student.student_id);
    await fetchWishlist(student.student_id);
  };

  // 대학 검색
  const searchUniversities = async () => {
    if (!searchTerm.trim()) return;
    try {
      const res = await apiFetch(
        `/api/universities?year=${year}&search=${encodeURIComponent(searchTerm)}`
      );
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.universities);
      }
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  // 대학 추가
  const handleAddUniversity = async (uid: number) => {
    if (!selectedStudent) return;

    try {
      const res = await apiFetch('/api/counseling/wishlist', {
        method: 'POST',
        body: JSON.stringify({
          student_id: selectedStudent.student_id,
          uid,
          year,
          priority: wishlist.length + 1,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setSearchTerm('');
        setSearchResults([]);
        fetchWishlist(selectedStudent.student_id);
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert('추가에 실패했습니다.');
    }
  };

  // 대학 삭제
  const handleRemoveUniversity = async (id: number) => {
    if (!confirm('삭제하시겠습니까?')) return;

    try {
      const res = await apiFetch(`/api/counseling/wishlist?id=${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (data.success && selectedStudent) {
        fetchWishlist(selectedStudent.student_id);
      }
    } catch (error) {
      alert('삭제에 실패했습니다.');
    }
  };

  // 점수 계산 및 업데이트
  const handleCalculateAll = async () => {
    if (!selectedStudent || !studentScore) return;

    setLoading(true);
    try {
      for (const item of wishlist) {
        // 수능 점수 계산
        const suneungRes = await apiFetch('/api/calculate/suneung', {
          method: 'POST',
          body: JSON.stringify({
            uid: item.U_ID,
            year,
            studentScore: {
              국어: {
                std: studentScore.국어_표점,
                percentile: studentScore.국어_백분,
              },
              수학: {
                std: studentScore.수학_표점,
                percentile: studentScore.수학_백분,
              },
              영어: { grade: studentScore.영어_등급 },
              탐구: [
                {
                  subject: studentScore.탐구1_과목,
                  std: studentScore.탐구1_표점,
                  percentile: studentScore.탐구1_백분,
                },
                {
                  subject: studentScore.탐구2_과목,
                  std: studentScore.탐구2_표점,
                  percentile: studentScore.탐구2_백분,
                },
              ],
              한국사: { grade: studentScore.한국사_등급 },
            },
          }),
        });

        const suneungData = await suneungRes.json();
        const suneungScore = suneungData.success ? suneungData.result.총점 : 0;

        // 상담 목록 업데이트
        await apiFetch('/api/counseling/wishlist', {
          method: 'PUT',
          body: JSON.stringify({
            id: item.id,
            suneung_score: suneungScore,
            total_score: suneungScore, // 실기 점수 추가 시 합산
          }),
        });
      }

      fetchWishlist(selectedStudent.student_id);
    } catch (error) {
      console.error('Calculate failed:', error);
      alert('계산에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // PDF 다운로드
  const handleDownloadPDF = async () => {
    if (!selectedStudent || !studentScore || wishlist.length === 0) {
      alert('학생과 상담 목록이 필요합니다.');
      return;
    }

    setGeneratingPDF(true);
    try {
      await generateCounselPDF(
        {
          name: selectedStudent.student_name,
          school: selectedStudent.school_name || '',
          gender: selectedStudent.gender,
        },
        studentScore,
        wishlist,
        year
      );
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('PDF 생성에 실패했습니다.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [year]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">개인별 상담</h1>
          <p className="text-gray-500 mt-1">학생별 지원 대학 상담</p>
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

        {/* 상담 내용 */}
        <div className="lg:col-span-3 space-y-6">
          {selectedStudent ? (
            <>
              {/* 학생 성적 요약 */}
              {studentScore && (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {selectedStudent.student_name} - 수능 성적
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-center">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-lg font-semibold">
                          {studentScore.국어_표점}/{studentScore.국어_백분}
                        </div>
                        <div className="text-sm text-gray-500">국어 (표/백)</div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-lg font-semibold">
                          {studentScore.수학_표점}/{studentScore.수학_백분}
                        </div>
                        <div className="text-sm text-gray-500">수학 (표/백)</div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-lg font-semibold">{studentScore.영어_등급}등급</div>
                        <div className="text-sm text-gray-500">영어</div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-lg font-semibold">
                          {studentScore.탐구1_표점}/{studentScore.탐구1_백분}
                        </div>
                        <div className="text-sm text-gray-500">
                          {studentScore.탐구1_과목 || '탐구1'}
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-lg font-semibold">
                          {studentScore.탐구2_표점}/{studentScore.탐구2_백분}
                        </div>
                        <div className="text-sm text-gray-500">
                          {studentScore.탐구2_과목 || '탐구2'}
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-lg font-semibold">{studentScore.한국사_등급}등급</div>
                        <div className="text-sm text-gray-500">한국사</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 상담 목록 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>지원 희망 대학 ({wishlist.length}개)</span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={handleDownloadPDF}
                        disabled={generatingPDF || wishlist.length === 0}
                      >
                        {generatingPDF ? 'PDF 생성 중...' : 'PDF 다운로드'}
                      </Button>
                      <Button variant="outline" onClick={handleCalculateAll} disabled={loading}>
                        {loading ? '계산 중...' : '전체 계산'}
                      </Button>
                      <Button onClick={() => setShowAddModal(true)}>대학 추가</Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {wishlist.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      아직 추가된 대학이 없습니다.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-2 font-medium text-gray-600">순위</th>
                            <th className="text-left py-3 px-2 font-medium text-gray-600">대학</th>
                            <th className="text-left py-3 px-2 font-medium text-gray-600">학과</th>
                            <th className="text-left py-3 px-2 font-medium text-gray-600">군</th>
                            <th className="text-center py-3 px-2 font-medium text-gray-600">
                              반영비율
                            </th>
                            <th className="text-center py-3 px-2 font-medium text-gray-600">
                              환산점수
                            </th>
                            <th className="text-right py-3 px-2 font-medium text-gray-600">관리</th>
                          </tr>
                        </thead>
                        <tbody>
                          {wishlist.map((item, index) => (
                            <tr key={item.id} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-2">{index + 1}</td>
                              <td className="py-3 px-2 font-medium">{item.대학명}</td>
                              <td className="py-3 px-2">{item.학과명}</td>
                              <td className="py-3 px-2">
                                <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                                  {item.군}군
                                </span>
                              </td>
                              <td className="py-3 px-2 text-center text-sm">
                                수능 {item.수능}% / 실기 {item.실기}%
                              </td>
                              <td className="py-3 px-2 text-center">
                                {item.total_score !== null ? (
                                  <span className="font-semibold text-blue-600">
                                    {item.total_score?.toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="py-3 px-2 text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600"
                                  onClick={() => handleRemoveUniversity(item.id)}
                                >
                                  삭제
                                </Button>
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
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                좌측에서 학생을 선택해주세요.
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* 대학 추가 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>대학 추가</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="대학명 또는 학과명 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchUniversities()}
                />
                <Button onClick={searchUniversities}>검색</Button>
              </div>

              {searchResults.length > 0 && (
                <div className="max-h-80 overflow-y-auto border rounded-lg">
                  {searchResults.map((univ) => (
                    <div
                      key={univ.U_ID}
                      className="p-3 border-b hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                      onClick={() => handleAddUniversity(univ.U_ID)}
                    >
                      <div>
                        <div className="font-medium">{univ.대학명}</div>
                        <div className="text-sm text-gray-500">
                          {univ.학과명} | {univ.군}군
                        </div>
                      </div>
                      <Button size="sm" variant="ghost">
                        추가
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end pt-4">
                <Button variant="outline" onClick={() => setShowAddModal(false)}>
                  닫기
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
