import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getWithFallback } from '@/lib/db-utils';
import { getTokenFromRequest } from '@/lib/auth';
import {
  calculatePracticalScore,
  buildPracticalScoreList,
} from '@/lib/silgical';
import type { PracticalRecord, ScoreTableRow } from '@/lib/silgical';

// POST: 실기 점수 계산
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
    const { uid, year, studentRecords, gender, practicalTotal } = body;

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

    // 실기 배점표 조회
    const { data: scoreTableRows, actualYear } = await getWithFallback(
      '정시실기배점',
      targetYear,
      'U_ID = ?',
      [uid]
    );

    if (scoreTableRows.length === 0) {
      return NextResponse.json({
        success: true,
        message: '실기 배점표가 없습니다.',
        university: {
          name: university.대학명,
          department: university.학과명,
        },
        result: {
          총점: 0,
          종목별점수: [],
          계산로그: ['실기 배점표가 없습니다.'],
        },
        hasScoreTable: false,
      });
    }

    // 배점표 형식 변환
    const scoreTable: ScoreTableRow[] = scoreTableRows.map((row: any) => ({
      종목명: row.종목명,
      성별: row.성별 || '',
      기록: row.기록,
      배점: Number(row.배점),
    }));

    // 실기 종목 목록 추출
    const events = [...new Set(scoreTable.map((r) => r.종목명))];

    // 학생 기록 구성
    const records: PracticalRecord[] = studentRecords || [];

    // 성별 처리
    const studentGender: 'M' | 'F' | '' = gender === 'M' || gender === 'F' ? gender : '';

    // 실기 총점 (반영비율에서 가져오거나 기본값)
    const total = practicalTotal || 100;

    // 점수 계산
    const result = calculatePracticalScore(records, scoreTable, studentGender, total);

    return NextResponse.json({
      success: true,
      university: {
        name: university.대학명,
        department: university.학과명,
        group: university.군,
      },
      events,
      result,
      actualYear,
      hasScoreTable: true,
    });
  } catch (error) {
    console.error('Calculate silgi error:', error);
    return NextResponse.json(
      { success: false, message: '실기 점수 계산에 실패했습니다.' },
      { status: 500 }
    );
  }
}

// GET: 실기 종목 및 배점표 조회
export async function GET(request: Request) {
  try {
    const user = getTokenFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear() + 1));

    if (!uid) {
      return NextResponse.json(
        { success: false, message: 'U_ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 실기 배점표 조회
    const { data: scoreTableRows, actualYear } = await getWithFallback(
      '정시실기배점',
      year,
      'U_ID = ?',
      [uid]
    );

    // 종목별로 그룹화
    const eventMap: Record<string, ScoreTableRow[]> = {};
    for (const row of scoreTableRows as any[]) {
      const eventName = row.종목명;
      if (!eventMap[eventName]) {
        eventMap[eventName] = [];
      }
      eventMap[eventName].push({
        종목명: row.종목명,
        성별: row.성별 || '',
        기록: row.기록,
        배점: Number(row.배점),
      });
    }

    return NextResponse.json({
      success: true,
      events: Object.keys(eventMap),
      scoreTable: eventMap,
      actualYear,
      totalRows: scoreTableRows.length,
    });
  } catch (error) {
    console.error('Get silgi table error:', error);
    return NextResponse.json(
      { success: false, message: '실기 배점표 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}
