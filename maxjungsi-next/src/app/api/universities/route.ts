import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getWithFallback } from '@/lib/db-utils';
import { getTokenFromRequest } from '@/lib/auth';

// GET: 대학 목록 조회 (연도별 fallback 적용)
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
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear() + 1));
    const search = searchParams.get('search') || '';
    const region = searchParams.get('region') || '';
    const group = searchParams.get('group') || ''; // 군(가/나/다)
    const uid = searchParams.get('uid') || '';

    // 단일 대학 조회
    if (uid) {
      const { data, actualYear } = await getWithFallback(
        '정시기본',
        year,
        'U_ID = ?',
        [uid]
      );

      if (data.length === 0) {
        return NextResponse.json(
          { success: false, message: '대학을 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      // 반영비율도 함께 조회
      const { data: formula } = await getWithFallback(
        '정시반영비율',
        year,
        'U_ID = ?',
        [uid]
      );

      return NextResponse.json({
        success: true,
        university: data[0],
        formula: formula[0] || null,
        actualYear,
      });
    }

    // 목록 조회 (fallback 적용)
    let condition = '1=1';
    const params: any[] = [];

    if (search) {
      condition += ' AND (대학명 LIKE ? OR 학과명 LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (region) {
      condition += ' AND 지역 = ?';
      params.push(region);
    }

    if (group) {
      condition += ' AND 군 = ?';
      params.push(group);
    }

    const { data: universities, actualYear } = await getWithFallback(
      '정시기본',
      year,
      condition,
      params
    );

    // 지역 목록도 함께 반환
    const regions = await query<{ 지역: string }>(
      `SELECT DISTINCT 지역 FROM \`정시기본\` WHERE 학년도 = ? ORDER BY 지역`,
      [actualYear]
    );

    return NextResponse.json({
      success: true,
      universities,
      regions: regions.map((r) => r.지역),
      actualYear,
      count: universities.length,
    });
  } catch (error) {
    console.error('Universities GET error:', error);
    return NextResponse.json(
      { success: false, message: '대학 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}
