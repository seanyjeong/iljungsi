'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api';

interface DebugNote {
  U_ID: number;
  학년도: number;
  is_correct: 'Y' | 'N' | '?';
  memo: string;
  updated_at: string;
  대학명?: string;
  학과명?: string;
}

interface University {
  U_ID: number;
  대학명: string;
  학과명: string;
}

export default function DebugNotesPage() {
  const [year, setYear] = useState(2026);
  const [notes, setNotes] = useState<DebugNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<number | null>(null);

  // 대학 검색 관련
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<University[]>([]);
  const [selectedUniv, setSelectedUniv] = useState<University | null>(null);
  const [newNote, setNewNote] = useState({ is_correct: '?' as 'Y' | 'N' | '?', memo: '' });

  // 디버그 메모 목록 로드
  const fetchNotes = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/admin/debug-notes?year=${year}`);
      const data = await res.json();
      if (data.success) {
        setNotes(data.list || []);
      }
    } catch (error) {
      console.error('Failed to fetch debug notes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [year]);

  // 대학 검색
  const searchUniversities = async () => {
    if (!search.trim()) return;
    try {
      const res = await apiFetch(`/api/universities?year=${year}&search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.universities || []);
      }
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  // 새 메모 저장
  const handleAddNote = async () => {
    if (!selectedUniv) return;
    setSaving(selectedUniv.U_ID);
    try {
      const res = await apiFetch('/api/admin/debug-notes', {
        method: 'POST',
        body: JSON.stringify({
          U_ID: selectedUniv.U_ID,
          year,
          is_correct: newNote.is_correct,
          memo: newNote.memo,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('저장되었습니다.');
        setSelectedUniv(null);
        setNewNote({ is_correct: '?', memo: '' });
        setSearchResults([]);
        setSearch('');
        fetchNotes();
      } else {
        alert(data.message || '저장에 실패했습니다.');
      }
    } catch (error) {
      alert('저장에 실패했습니다.');
    } finally {
      setSaving(null);
    }
  };

  // 기존 메모 업데이트
  const handleUpdateNote = async (note: DebugNote) => {
    setSaving(note.U_ID);
    try {
      const res = await apiFetch('/api/admin/debug-notes', {
        method: 'POST',
        body: JSON.stringify({
          U_ID: note.U_ID,
          year,
          is_correct: note.is_correct,
          memo: note.memo,
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
      setSaving(null);
    }
  };

  // 메모 상태 변경
  const handleNoteChange = (uid: number, field: 'is_correct' | 'memo', value: string) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.U_ID === uid ? { ...n, [field]: value } : n
      )
    );
  };

  // 상태 배지 색상
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Y':
        return 'bg-green-100 text-green-800';
      case 'N':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">디버그 메모</h1>
        <p className="text-gray-500 mt-1">대학별 계산 검증 상태 및 메모 관리</p>
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
              <option value={2026}>2026학년도</option>
              <option value={2027}>2027학년도</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* 새 메모 추가 */}
      <Card>
        <CardHeader>
          <CardTitle>새 메모 추가</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <Input
                placeholder="대학명 또는 학과명 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchUniversities()}
                className="flex-1"
              />
              <Button onClick={searchUniversities}>검색</Button>
            </div>

            {searchResults.length > 0 && (
              <div className="max-h-40 overflow-y-auto border rounded-lg">
                {searchResults.map((univ) => (
                  <div
                    key={univ.U_ID}
                    className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${
                      selectedUniv?.U_ID === univ.U_ID ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedUniv(univ)}
                  >
                    <span className="font-medium">{univ.대학명}</span>
                    <span className="text-gray-500 ml-2">{univ.학과명}</span>
                    <span className="text-gray-400 ml-2 text-sm">U_ID: {univ.U_ID}</span>
                  </div>
                ))}
              </div>
            )}

            {selectedUniv && (
              <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                <div className="font-medium">
                  {selectedUniv.대학명} - {selectedUniv.학과명}
                  <span className="text-gray-500 ml-2">(U_ID: {selectedUniv.U_ID})</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">검증 상태:</span>
                  <select
                    value={newNote.is_correct}
                    onChange={(e) => setNewNote({ ...newNote, is_correct: e.target.value as 'Y' | 'N' | '?' })}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="?">? (미확인)</option>
                    <option value="Y">Y (정상)</option>
                    <option value="N">N (오류)</option>
                  </select>
                </div>
                <div>
                  <textarea
                    placeholder="메모 내용..."
                    value={newNote.memo}
                    onChange={(e) => setNewNote({ ...newNote, memo: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg min-h-[80px]"
                  />
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleAddNote} disabled={saving === selectedUniv.U_ID}>
                    {saving === selectedUniv.U_ID ? '저장 중...' : '메모 추가'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 메모 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>등록된 메모 ({notes.length}건)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : notes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">등록된 메모가 없습니다.</div>
          ) : (
            <div className="space-y-4">
              {notes.map((note) => (
                <div key={note.U_ID} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="font-medium">{note.대학명 || `U_ID: ${note.U_ID}`}</span>
                      {note.학과명 && <span className="text-gray-500 ml-2">{note.학과명}</span>}
                      <span className="text-gray-400 ml-2 text-sm">U_ID: {note.U_ID}</span>
                    </div>
                    <span className={`px-2 py-1 rounded text-sm font-medium ${getStatusBadge(note.is_correct)}`}>
                      {note.is_correct === 'Y' ? '정상' : note.is_correct === 'N' ? '오류' : '미확인'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mb-3">
                    <span className="text-sm font-medium">상태:</span>
                    <select
                      value={note.is_correct}
                      onChange={(e) => handleNoteChange(note.U_ID, 'is_correct', e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded"
                    >
                      <option value="?">? (미확인)</option>
                      <option value="Y">Y (정상)</option>
                      <option value="N">N (오류)</option>
                    </select>
                    <span className="text-xs text-gray-400 ml-auto">
                      {note.updated_at && new Date(note.updated_at).toLocaleString()}
                    </span>
                  </div>
                  <textarea
                    value={note.memo}
                    onChange={(e) => handleNoteChange(note.U_ID, 'memo', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded min-h-[60px] text-sm"
                    placeholder="메모..."
                  />
                  <div className="flex justify-end mt-2">
                    <Button
                      size="sm"
                      onClick={() => handleUpdateNote(note)}
                      disabled={saving === note.U_ID}
                    >
                      {saving === note.U_ID ? '저장 중...' : '저장'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
