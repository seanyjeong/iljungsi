'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api';
import type { Student } from '@/types/student';

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(2026); // 현재 입시년도 (2025년 기준)
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // 신규 학생 폼
  const [newStudent, setNewStudent] = useState({
    student_name: '',
    school_name: '',
    gender: 'M',
  });

  // 학생 목록 조회
  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/students?year=${year}`);
      const data = await res.json();
      if (data.success) {
        setStudents(data.students);
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

  // 학생 추가
  const handleAddStudent = async () => {
    if (!newStudent.student_name.trim()) {
      alert('학생 이름을 입력해주세요.');
      return;
    }

    try {
      const res = await apiFetch('/api/students', {
        method: 'POST',
        body: JSON.stringify({
          students: [newStudent],
          year,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert('학생이 추가되었습니다.');
        setShowAddModal(false);
        setNewStudent({ student_name: '', school_name: '', gender: 'M' });
        fetchStudents();
      } else {
        alert(data.message || '학생 추가에 실패했습니다.');
      }
    } catch (error) {
      alert('서버 연결에 실패했습니다.');
    }
  };

  // 학생 수정
  const handleUpdateStudent = async () => {
    if (!editingStudent) return;

    try {
      const res = await apiFetch(`/api/students/${editingStudent.student_id}`, {
        method: 'PUT',
        body: JSON.stringify({
          student_name: editingStudent.student_name,
          school_name: editingStudent.school_name,
          gender: editingStudent.gender,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert('학생 정보가 수정되었습니다.');
        setEditingStudent(null);
        fetchStudents();
      } else {
        alert(data.message || '수정에 실패했습니다.');
      }
    } catch (error) {
      alert('서버 연결에 실패했습니다.');
    }
  };

  // 학생 삭제
  const handleDeleteStudent = async (studentId: number) => {
    if (!confirm('정말 삭제하시겠습니까? 관련 상담 기록도 함께 삭제됩니다.')) {
      return;
    }

    try {
      const res = await apiFetch(`/api/students/${studentId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (data.success) {
        alert('학생이 삭제되었습니다.');
        fetchStudents();
      } else {
        alert(data.message || '삭제에 실패했습니다.');
      }
    } catch (error) {
      alert('서버 연결에 실패했습니다.');
    }
  };

  // 필터링된 학생 목록
  const filteredStudents = students.filter(
    (s) =>
      s.student_name.includes(searchTerm) ||
      s.school_name?.includes(searchTerm) ||
      s.branch_name?.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">학생 관리</h1>
          <p className="text-gray-500 mt-1">학생 추가, 수정, 삭제</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>학생 추가</Button>
      </div>

      {/* 필터 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value={2026}>2026학년도 (현재)</option>
              <option value={2027}>2027학년도 (내년)</option>
              <option value={2025}>2025학년도</option>
            </select>
            <Input
              placeholder="이름, 학교, 지점으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* 학생 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>
            학생 목록 ({filteredStudents.length}명)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              학생이 없습니다.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      이름
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      학교
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      성별
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      지점
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">
                      관리
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr
                      key={student.student_id}
                      className="border-b hover:bg-gray-50"
                    >
                      <td className="py-3 px-4 font-medium">
                        {student.student_name}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {student.school_name || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            student.gender === 'M'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-pink-100 text-pink-700'
                          }`}
                        >
                          {student.gender === 'M' ? '남' : '여'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {student.branch_name}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingStudent(student)}
                        >
                          수정
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteStudent(student.student_id)}
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

      {/* 학생 추가 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>학생 추가</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="이름"
                value={newStudent.student_name}
                onChange={(e) =>
                  setNewStudent({ ...newStudent, student_name: e.target.value })
                }
                placeholder="학생 이름"
              />
              <Input
                label="학교"
                value={newStudent.school_name}
                onChange={(e) =>
                  setNewStudent({ ...newStudent, school_name: e.target.value })
                }
                placeholder="학교명"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  성별
                </label>
                <select
                  value={newStudent.gender}
                  onChange={(e) =>
                    setNewStudent({ ...newStudent, gender: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="M">남</option>
                  <option value="F">여</option>
                </select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowAddModal(false)}
                >
                  취소
                </Button>
                <Button className="flex-1" onClick={handleAddStudent}>
                  추가
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 학생 수정 모달 */}
      {editingStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>학생 수정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="이름"
                value={editingStudent.student_name}
                onChange={(e) =>
                  setEditingStudent({
                    ...editingStudent,
                    student_name: e.target.value,
                  })
                }
              />
              <Input
                label="학교"
                value={editingStudent.school_name || ''}
                onChange={(e) =>
                  setEditingStudent({
                    ...editingStudent,
                    school_name: e.target.value,
                  })
                }
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  성별
                </label>
                <select
                  value={editingStudent.gender}
                  onChange={(e) =>
                    setEditingStudent({
                      ...editingStudent,
                      gender: e.target.value as 'M' | 'F',
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="M">남</option>
                  <option value="F">여</option>
                </select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setEditingStudent(null)}
                >
                  취소
                </Button>
                <Button className="flex-1" onClick={handleUpdateStudent}>
                  저장
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
