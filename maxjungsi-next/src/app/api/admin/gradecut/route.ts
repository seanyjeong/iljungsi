import { NextResponse } from 'next/server';
import { query, getConnection } from '@/lib/db';
import { getTokenFromRequest } from '@/lib/auth';

// GET: 등급컷 조회
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
    const model = searchParams.get('model') || '6모'; // 6모, 9모, 수능

    const rows = await query(
      `SELECT 선택과목명, 등급, 원점수, 표준점수, 백분위
       FROM \`정시예상등급컷\`
       WHERE 학년도 = ? AND 모형 = ?
       ORDER BY 선택과목명, 등급`,
      [year, model]
    );

    // 과목별로 그룹화
    const bySubject: Record<string, any[]> = {};
    for (const row of rows as any[]) {
      if (!bySubject[row.선택과목명]) {
        bySubject[row.선택과목명] = [];
      }
      bySubject[row.선택과목명].push(row);
    }

    // 사용 가능한 모형 목록
    const models = await query<{ 모형: string }>(
      `SELECT DISTINCT 모형 FROM \`정시예상등급컷\` WHERE 학년도 = ? ORDER BY 모형`,
      [year]
    );

    return NextResponse.json({
      success: true,
      data: bySubject,
      models: models.map((m) => m.모형),
      currentModel: model,
    });
  } catch (error) {
    console.error('Gradecut GET error:', error);
    return NextResponse.json(
      { success: false, message: '등급컷 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}

// POST: 등급컷 저장
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
    const { year, model, subject, cuts } = body;

    if (!subject || !cuts || !Array.isArray(cuts)) {
      return NextResponse.json(
        { success: false, message: '과목과 등급컷 데이터가 필요합니다.' },
        { status: 400 }
      );
    }

    const targetYear = year || new Date().getFullYear() + 1;
    const targetModel = model || '6모';

    const connection = await getConnection();
    await connection.beginTransaction();

    try {
      // 기존 데이터 삭제
      await connection.query(
        'DELETE FROM `정시예상등급컷` WHERE 학년도 = ? AND 모형 = ? AND 선택과목명 = ?',
        [targetYear, targetModel, subject]
      );

      // 새 데이터 삽입
      for (const cut of cuts) {
        if (cut.등급) {
          await connection.query(
            `INSERT INTO \`정시예상등급컷\` (학년도, 모형, 선택과목명, 등급, 원점수, 표준점수, 백분위)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              targetYear,
              targetModel,
              subject,
              cut.등급,
              cut.원점수 || null,
              cut.표준점수 || null,
              cut.백분위 || null,
            ]
          );
        }
      }

      await connection.commit();

      return NextResponse.json({
        success: true,
        message: `${subject} 등급컷이 저장되었습니다.`,
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Gradecut POST error:', error);
    return NextResponse.json(
      { success: false, message: '등급컷 저장에 실패했습니다.' },
      { status: 500 }
    );
  }
}
