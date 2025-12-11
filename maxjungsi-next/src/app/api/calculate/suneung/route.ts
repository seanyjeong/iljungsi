import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getWithFallback } from '@/lib/db-utils';
import { getTokenFromRequest } from '@/lib/auth';
import { calculateScore, safeParse } from '@/lib/jungsical';
import type { StudentScore, UniversityFormula, ScoreConfig } from '@/lib/jungsical';

// POST: 수능 점수 계산
export async function POST(request: Request) {
  try {
    const user = getTokenFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { uid, year, studentScore } = body;

    if (!uid) {
      return NextResponse.json(
        { success: false, message: 'U_ID가 필요합니다.' },
        { status: 400 }
      );
    }

    const targetYear = year || new Date().getFullYear() + 1;

    // 대학 기본 정보 조회
    const { data: universities } = await getWithFallback(
      '정시기본',
      targetYear,
      'U_ID = ?',
      [uid]
    );

    if (universities.length === 0) {
      return NextResponse.json(
        { success: false, message: '대학을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const university = universities[0];

    // 반영비율 조회
    const { data: formulas } = await getWithFallback(
      '정시반영비율',
      targetYear,
      'U_ID = ?',
      [uid]
    );

    if (formulas.length === 0) {
      return NextResponse.json(
        { success: false, message: '반영비율 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const formula = formulas[0] as UniversityFormula;

    // 최고 표준점수 조회 (과목별)
    const highestRows = await query<{ 과목: string; 최고표점: number }>(
      `SELECT 과목, 최고표점 FROM \`정시최고표점\` WHERE 학년도 = ?`,
      [targetYear]
    );

    const highestMap: Record<string, number> = {};
    for (const row of highestRows) {
      highestMap[row.과목] = row.최고표점;
    }

    // 탐구 변환표 조회 (필요시)
    let conversionTable: Record<string, Record<number, number>> | null = null;
    const scoreConfig = safeParse<ScoreConfig>(formula.score_config, {});

    if (scoreConfig?.inquiry?.type === '변환표준점수') {
      const convRows = await query<{ 계열: string; 백분위: number; 변환표준점수: number }>(
        `SELECT 계열, 백분위, 변환표준점수 FROM \`정시탐구변환표준\` WHERE U_ID = ? AND 학년도 = ?`,
        [uid, targetYear]
      );

      if (convRows.length > 0) {
        conversionTable = {};
        for (const row of convRows) {
          if (!conversionTable[row.계열]) {
            conversionTable[row.계열] = {};
          }
          conversionTable[row.계열][row.백분위] = row.변환표준점수;
        }
      }
    }

    // 학생 성적 구성
    const S: StudentScore = studentScore || {
      국어: { std: 0, percentile: 0 },
      수학: { std: 0, percentile: 0 },
      영어: { grade: 9 },
      탐구: [],
      한국사: { grade: 9 },
    };

    // 점수 계산
    const result = calculateScore(formula, S, highestMap, conversionTable);

    return NextResponse.json({
      success: true,
      university: {
        name: university.대학명,
        department: university.학과명,
        group: university.군,
        region: university.지역,
      },
      result,
      formula: {
        총점: formula.총점,
        수능: formula.수능,
        내신: formula.내신,
        실기: formula.실기,
        국어: formula.국어,
        수학: formula.수학,
        영어: formula.영어,
        탐구: formula.탐구,
        한국사: formula.한국사,
      },
    });
  } catch (error) {
    console.error('Calculate suneung error:', error);
    return NextResponse.json(
      { success: false, message: '점수 계산에 실패했습니다.' },
      { status: 500 }
    );
  }
}
