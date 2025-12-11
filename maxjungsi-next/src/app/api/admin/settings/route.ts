import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getTokenFromRequest } from '@/lib/auth';

// GET: 대학별 영어/한국사 점수표 조회
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
    const uid = searchParams.get('uid');
    const year = searchParams.get('year') || new Date().getFullYear() + 1;

    if (!uid) {
      return NextResponse.json(
        { success: false, message: 'U_ID가 필요합니다.' },
        { status: 400 }
      );
    }

    const rows = await query(
      `SELECT U_ID, 학년도, english_scores, history_scores, score_config, bonus_rules, selection_rules
       FROM \`정시반영비율\` WHERE U_ID = ? AND 학년도 = ?`,
      [uid, year]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, message: '해당 대학 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const row = rows[0] as any;

    // JSON 파싱
    let englishScores = {};
    let historyScores = {};
    let scoreConfig = {};
    let bonusRules = null;
    let selectionRules = null;

    try {
      englishScores = row.english_scores ? JSON.parse(row.english_scores) : {};
    } catch {}
    try {
      historyScores = row.history_scores ? JSON.parse(row.history_scores) : {};
    } catch {}
    try {
      scoreConfig = row.score_config ? JSON.parse(row.score_config) : {};
    } catch {}
    try {
      bonusRules = row.bonus_rules ? JSON.parse(row.bonus_rules) : null;
    } catch {}
    try {
      selectionRules = row.selection_rules ? JSON.parse(row.selection_rules) : null;
    } catch {}

    return NextResponse.json({
      success: true,
      data: {
        englishScores,
        historyScores,
        scoreConfig,
        bonusRules,
        selectionRules,
      },
    });
  } catch (error) {
    console.error('Settings GET error:', error);
    return NextResponse.json(
      { success: false, message: '설정 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}

// POST: 대학별 영어/한국사 점수표 저장
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
    const { uid, year, englishScores, historyScores, scoreConfig, bonusRules, selectionRules } = body;

    if (!uid) {
      return NextResponse.json(
        { success: false, message: 'U_ID가 필요합니다.' },
        { status: 400 }
      );
    }

    const targetYear = year || new Date().getFullYear() + 1;

    // 업데이트할 필드만 처리
    const updates: string[] = [];
    const params: any[] = [];

    if (englishScores !== undefined) {
      updates.push('english_scores = ?');
      params.push(JSON.stringify(englishScores));
    }
    if (historyScores !== undefined) {
      updates.push('history_scores = ?');
      params.push(JSON.stringify(historyScores));
    }
    if (scoreConfig !== undefined) {
      updates.push('score_config = ?');
      params.push(JSON.stringify(scoreConfig));
    }
    if (bonusRules !== undefined) {
      updates.push('bonus_rules = ?');
      params.push(bonusRules ? JSON.stringify(bonusRules) : null);
    }
    if (selectionRules !== undefined) {
      updates.push('selection_rules = ?');
      params.push(selectionRules ? JSON.stringify(selectionRules) : null);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, message: '업데이트할 내용이 없습니다.' },
        { status: 400 }
      );
    }

    params.push(uid, targetYear);

    await query(
      `UPDATE \`정시반영비율\` SET ${updates.join(', ')} WHERE U_ID = ? AND 학년도 = ?`,
      params
    );

    return NextResponse.json({
      success: true,
      message: '설정이 저장되었습니다.',
    });
  } catch (error) {
    console.error('Settings POST error:', error);
    return NextResponse.json(
      { success: false, message: '설정 저장에 실패했습니다.' },
      { status: 500 }
    );
  }
}
