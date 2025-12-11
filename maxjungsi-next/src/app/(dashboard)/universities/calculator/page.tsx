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
  지역: string;
  모집정원?: number;
}

interface CalculationResult {
  총점: number;
  수능점수: number;
  국어점수: number;
  수학점수: number;
  영어점수: number;
  탐구점수: number;
  한국사점수: number;
  계산로그: string[];
}

interface SilgiResult {
  총점: number;
  종목별점수: Array<{
    event: string;
    record: number | string;
    score: number;
    maxScore: number;
  }>;
  계산로그: string[];
}

export default function CalculatorPage() {
  const [year, setYear] = useState(2027);
  const [search, setSearch] = useState('');
  const [universities, setUniversities] = useState<University[]>([]);
  const [selectedUniv, setSelectedUniv] = useState<University | null>(null);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);

  // 학생 성적 입력
  const [scores, setScores] = useState({
    국어_표점: '',
    국어_백분: '',
    수학_표점: '',
    수학_백분: '',
    영어_등급: '1',
    탐구1_과목: '',
    탐구1_표점: '',
    탐구1_백분: '',
    탐구2_과목: '',
    탐구2_표점: '',
    탐구2_백분: '',
    한국사_등급: '1',
    gender: 'M',
  });

  // 실기 기록 입력
  const [silgiEvents, setSilgiEvents] = useState<string[]>([]);
  const [silgiRecords, setSilgiRecords] = useState<Record<string, string>>({});

  // 계산 결과
  const [suneungResult, setSuneungResult] = useState<CalculationResult | null>(null);
  const [silgiResult, setSilgiResult] = useState<SilgiResult | null>(null);
  const [showLog, setShowLog] = useState(false);

  // 대학 검색
  const searchUniversities = async () => {
    if (!search.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/universities?year=${year}&search=${encodeURIComponent(search)}`
      );
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

  // 대학 선택 시 실기 종목 조회
  const handleSelectUniversity = async (univ: University) => {
    setSelectedUniv(univ);
    setSuneungResult(null);
    setSilgiResult(null);

    // 실기 종목 조회
    try {
      const res = await fetch(`/api/calculate/silgi?uid=${univ.U_ID}&year=${year}`);
      const data = await res.json();
      if (data.success && data.events) {
        setSilgiEvents(data.events);
        // 기록 초기화
        const records: Record<string, string> = {};
        for (const event of data.events) {
          records[event] = '';
        }
        setSilgiRecords(records);
      } else {
        setSilgiEvents([]);
        setSilgiRecords({});
      }
    } catch (error) {
      console.error('Failed to fetch silgi events:', error);
      setSilgiEvents([]);
    }
  };

  // 점수 계산
  const handleCalculate = async () => {
    if (!selectedUniv) return;

    setCalculating(true);
    try {
      // 수능 점수 계산
      const studentScore = {
        국어: {
          std: Number(scores.국어_표점) || 0,
          percentile: Number(scores.국어_백분) || 0,
        },
        수학: {
          std: Number(scores.수학_표점) || 0,
          percentile: Number(scores.수학_백분) || 0,
        },
        영어: {
          grade: Number(scores.영어_등급) || 9,
        },
        탐구: [
          {
            subject: scores.탐구1_과목 || '탐구1',
            std: Number(scores.탐구1_표점) || 0,
            percentile: Number(scores.탐구1_백분) || 0,
          },
          {
            subject: scores.탐구2_과목 || '탐구2',
            std: Number(scores.탐구2_표점) || 0,
            percentile: Number(scores.탐구2_백분) || 0,
          },
        ],
        한국사: {
          grade: Number(scores.한국사_등급) || 9,
        },
      };

      const suneungRes = await fetch('/api/calculate/suneung', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: selectedUniv.U_ID,
          year,
          studentScore,
        }),
      });

      const suneungData = await suneungRes.json();
      if (suneungData.success) {
        setSuneungResult(suneungData.result);
      }

      // 실기 점수 계산 (종목이 있는 경우)
      if (silgiEvents.length > 0) {
        const studentRecords = silgiEvents
          .filter((event) => silgiRecords[event])
          .map((event) => ({
            event,
            record: silgiRecords[event],
          }));

        if (studentRecords.length > 0) {
          const silgiRes = await fetch('/api/calculate/silgi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              uid: selectedUniv.U_ID,
              year,
              studentRecords,
              gender: scores.gender,
            }),
          });

          const silgiData = await silgiRes.json();
          if (silgiData.success) {
            setSilgiResult(silgiData.result);
          }
        }
      }
    } catch (error) {
      console.error('Calculation failed:', error);
      alert('점수 계산에 실패했습니다.');
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">대학 계산기</h1>
        <p className="text-gray-500 mt-1">대학별 환산점수 계산</p>
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
              placeholder="대학명 또는 학과명 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchUniversities()}
              className="flex-1"
            />
            <Button onClick={searchUniversities} disabled={loading}>
              {loading ? '검색 중...' : '검색'}
            </Button>
          </div>

          {/* 검색 결과 */}
          {universities.length > 0 && (
            <div className="mt-4 max-h-60 overflow-y-auto border rounded-lg">
              {universities.map((univ) => (
                <div
                  key={univ.U_ID}
                  className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${
                    selectedUniv?.U_ID === univ.U_ID ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleSelectUniversity(univ)}
                >
                  <div className="font-medium">{univ.대학명}</div>
                  <div className="text-sm text-gray-500">
                    {univ.학과명} | {univ.군}군 | {univ.지역}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 성적 입력 */}
      {selectedUniv && (
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedUniv.대학명} - {selectedUniv.학과명}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 기본 정보 */}
            <div className="flex gap-4 items-center">
              <label className="text-sm font-medium">성별</label>
              <select
                value={scores.gender}
                onChange={(e) => setScores({ ...scores, gender: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="M">남</option>
                <option value="F">여</option>
              </select>
            </div>

            {/* 수능 성적 */}
            <div>
              <h3 className="font-medium mb-3">수능 성적</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">국어 표점</label>
                  <Input
                    type="number"
                    value={scores.국어_표점}
                    onChange={(e) => setScores({ ...scores, 국어_표점: e.target.value })}
                    placeholder="표준점수"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">국어 백분</label>
                  <Input
                    type="number"
                    value={scores.국어_백분}
                    onChange={(e) => setScores({ ...scores, 국어_백분: e.target.value })}
                    placeholder="백분위"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">수학 표점</label>
                  <Input
                    type="number"
                    value={scores.수학_표점}
                    onChange={(e) => setScores({ ...scores, 수학_표점: e.target.value })}
                    placeholder="표준점수"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">수학 백분</label>
                  <Input
                    type="number"
                    value={scores.수학_백분}
                    onChange={(e) => setScores({ ...scores, 수학_백분: e.target.value })}
                    placeholder="백분위"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">영어 등급</label>
                  <select
                    value={scores.영어_등급}
                    onChange={(e) => setScores({ ...scores, 영어_등급: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((g) => (
                      <option key={g} value={g}>
                        {g}등급
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">한국사 등급</label>
                  <select
                    value={scores.한국사_등급}
                    onChange={(e) => setScores({ ...scores, 한국사_등급: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((g) => (
                      <option key={g} value={g}>
                        {g}등급
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 탐구 성적 */}
            <div>
              <h3 className="font-medium mb-3">탐구 성적</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <label className="block text-sm font-medium mb-2">탐구 1</label>
                  <Input
                    placeholder="과목명"
                    value={scores.탐구1_과목}
                    onChange={(e) => setScores({ ...scores, 탐구1_과목: e.target.value })}
                    className="mb-2"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      placeholder="표준점수"
                      value={scores.탐구1_표점}
                      onChange={(e) => setScores({ ...scores, 탐구1_표점: e.target.value })}
                    />
                    <Input
                      type="number"
                      placeholder="백분위"
                      value={scores.탐구1_백분}
                      onChange={(e) => setScores({ ...scores, 탐구1_백분: e.target.value })}
                    />
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <label className="block text-sm font-medium mb-2">탐구 2</label>
                  <Input
                    placeholder="과목명"
                    value={scores.탐구2_과목}
                    onChange={(e) => setScores({ ...scores, 탐구2_과목: e.target.value })}
                    className="mb-2"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      placeholder="표준점수"
                      value={scores.탐구2_표점}
                      onChange={(e) => setScores({ ...scores, 탐구2_표점: e.target.value })}
                    />
                    <Input
                      type="number"
                      placeholder="백분위"
                      value={scores.탐구2_백분}
                      onChange={(e) => setScores({ ...scores, 탐구2_백분: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 실기 성적 */}
            {silgiEvents.length > 0 && (
              <div>
                <h3 className="font-medium mb-3">실기 기록</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {silgiEvents.map((event) => (
                    <div key={event}>
                      <label className="block text-sm text-gray-600 mb-1">{event}</label>
                      <Input
                        value={silgiRecords[event] || ''}
                        onChange={(e) =>
                          setSilgiRecords({ ...silgiRecords, [event]: e.target.value })
                        }
                        placeholder="기록 입력"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              onClick={handleCalculate}
              disabled={calculating}
              className="w-full"
              size="lg"
            >
              {calculating ? '계산 중...' : '점수 계산'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 계산 결과 */}
      {(suneungResult || silgiResult) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>계산 결과</span>
              <Button variant="ghost" size="sm" onClick={() => setShowLog(!showLog)}>
                {showLog ? '로그 숨기기' : '로그 보기'}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* 수능 결과 */}
            {suneungResult && (
              <div className="mb-6">
                <h3 className="font-medium text-lg mb-3">수능 환산점수</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {suneungResult.총점.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">총점</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <div className="text-xl font-semibold">{suneungResult.국어점수.toFixed(2)}</div>
                    <div className="text-sm text-gray-600">국어</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <div className="text-xl font-semibold">{suneungResult.수학점수.toFixed(2)}</div>
                    <div className="text-sm text-gray-600">수학</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <div className="text-xl font-semibold">{suneungResult.영어점수.toFixed(2)}</div>
                    <div className="text-sm text-gray-600">영어</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <div className="text-xl font-semibold">{suneungResult.탐구점수.toFixed(2)}</div>
                    <div className="text-sm text-gray-600">탐구</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <div className="text-xl font-semibold">{suneungResult.한국사점수.toFixed(2)}</div>
                    <div className="text-sm text-gray-600">한국사</div>
                  </div>
                </div>
              </div>
            )}

            {/* 실기 결과 */}
            {silgiResult && silgiResult.종목별점수.length > 0 && (
              <div>
                <h3 className="font-medium text-lg mb-3">실기 환산점수</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {silgiResult.총점.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">실기 총점</div>
                  </div>
                  {silgiResult.종목별점수.map((item) => (
                    <div key={item.event} className="p-4 bg-gray-50 rounded-lg text-center">
                      <div className="text-xl font-semibold">
                        {item.score}/{item.maxScore}
                      </div>
                      <div className="text-sm text-gray-600">{item.event}</div>
                      <div className="text-xs text-gray-400">기록: {item.record}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 계산 로그 */}
            {showLog && (
              <div className="mt-6 p-4 bg-gray-100 rounded-lg">
                <h4 className="font-medium mb-2">계산 로그</h4>
                <div className="text-sm font-mono space-y-1">
                  {suneungResult?.계산로그.map((log, i) => (
                    <div key={i} className="text-gray-600">
                      {log}
                    </div>
                  ))}
                  {silgiResult?.계산로그.map((log, i) => (
                    <div key={`silgi-${i}`} className="text-gray-600">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
