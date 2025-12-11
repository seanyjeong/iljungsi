import { NextResponse } from 'next/server';
import { query, getConnection } from '@/lib/db';
import { getTokenFromRequest } from '@/lib/auth';

// GET: 최고표점 조회
export async function GET(request: Request) {
  try {
    const user = getTokenFromRequest(request);
    if (!user || user.userid !== 'admin') {
      return NextResponse.json(
        { success: false, message: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') || new Date().getFullYear() + 1;
    const model = searchParams.get('model') || '6모';

    const rows = await query(
      `SELECT 과목명, 최고점 FROM \`정시최고표점\` WHERE 학년도 = ? AND 모형 = ? ORDER BY 과목명`,
      [year, model]
    );

    // 사용 가능한 모형 목록
    const models = await query<{ 모형: string }>(
      `SELECT DISTINCT 모형 FROM \`정시최고표점\` WHERE 학년도 = ? ORDER BY 모형`,
      [year]
    );

    return NextResponse.json({
      success: true,
      data: rows,
      models: models.map((m) => m.모형),
    });
  } catch (error) {
    console.error('Highest score GET error:', error);
    return NextResponse.json(
      { success: false, message: '최고표점 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}

// POST: 최고표점 저장
export async function POST(request: Request) {
  try {
    const user = getTokenFromRequest(request);
    if (!user || user.userid !== 'admin') {
      return NextResponse.json(
        { success: false, message: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { year, model, scores } = body;

    if (!scores || !Array.isArray(scores)) {
      return NextResponse.json(
        { success: false, message: '점수 데이터가 필요합니다.' },
        { status: 400 }
      );
    }

    const targetYear = year || new Date().getFullYear() + 1;
    const targetModel = model || '6모';

    const connection = await getConnection();
    await connection.beginTransaction();

    try {
      for (const score of scores) {
        if (score.과목명 && score.최고점) {
          await connection.query(
            `INSERT INTO \`정시최고표점\` (학년도, 모형, 과목명, 최고점)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 최고점 = VALUES(최고점), updated_at = NOW()`,
            [targetYear, targetModel, score.과목명, score.최고점]
          );
        }
      }

      await connection.commit();

      return NextResponse.json({
        success: true,
        message: '최고표점이 저장되었습니다.',
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Highest score POST error:', error);
    return NextResponse.json(
      { success: false, message: '최고표점 저장에 실패했습니다.' },
      { status: 500 }
    );
  }
}
