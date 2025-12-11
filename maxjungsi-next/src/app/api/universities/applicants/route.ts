import { NextResponse } from 'next/server';
import { query, getConnection } from '@/lib/db';
import { getTokenFromRequest } from '@/lib/auth';

// GET: 특정 대학의 지원자 목록 조회
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
    const year = searchParams.get('year') || new Date().getFullYear() + 1;

    if (!uid) {
      return NextResponse.json(
        { success: false, message: 'U_ID가 필요합니다.' },
        { status: 400 }
      );
    }

    const connection = await getConnection();

    try {
      // 1. 대학 정보 조회
      const [univRows] = await connection.query(
        `SELECT U_ID, 대학명, 학과명, 군 FROM \`정시기본\` WHERE U_ID = ? AND 학년도 = ?`,
        [uid, year]
      );

      if ((univRows as any[]).length === 0) {
        return NextResponse.json(
          { success: false, message: '대학 정보를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      const university = (univRows as any[])[0];

      // 2. 지원자 목록 조회 (admin이면 전체, 아니면 본인 지점만)
      const isAdmin = user.userid === 'admin';
      let branchCondition = '';
      const queryParams: any[] = [year, uid];

      if (!isAdmin && user.branch) {
        branchCondition = 'AND b.branch_name = ?';
        queryParams.push(user.branch);
      }

      const [applicantsRows] = await connection.query(
        `SELECT DISTINCT
          b.student_id,
          b.student_name as name,
          b.school_name,
          b.branch_name as branch,
          s.국어_표준점수 as korean_standard,
          s.국어_백분위 as korean_percentile,
          s.수학_표준점수 as math_standard,
          s.수학_백분위 as math_percentile,
          s.영어_등급 as english_grade,
          s.탐구1_표준점수 as inquiry1_standard,
          s.탐구1_백분위 as inquiry1_percentile,
          s.탐구1_과목 as inquiry1_subject,
          s.탐구2_표준점수 as inquiry2_standard,
          s.탐구2_백분위 as inquiry2_percentile,
          s.탐구2_과목 as inquiry2_subject,
          s.한국사_등급 as history_grade,
          c.상담_수능점수 as suneung_score,
          c.상담_실기반영점수 as practical_score,
          c.상담_계산총점 as total_score,
          c.상담_실기기록 as practical_records_json
        FROM 정시_상담목록 c
        INNER JOIN 학생기본정보 b ON c.학생_ID = b.student_id AND c.학년도 = b.학년도
        LEFT JOIN 학생수능성적 s ON b.student_id = s.student_id AND b.학년도 = s.학년도
        WHERE c.학년도 = ?
          AND c.대학학과_ID = ?
          ${branchCondition}
        ORDER BY c.상담_계산총점 DESC, b.student_name`,
        queryParams
      );

      // 3. 데이터 가공
      const applicants = (applicantsRows as any[]).map((student) => {
        let practicalRecords = null;
        if (student.practical_records_json) {
          try {
            practicalRecords =
              typeof student.practical_records_json === 'string'
                ? JSON.parse(student.practical_records_json)
                : student.practical_records_json;
          } catch {
            practicalRecords = null;
          }
        }

        return {
          student_id: student.student_id,
          name: student.name,
          school_name: student.school_name || '',
          branch: student.branch,
          scores: {
            korean: {
              standard: student.korean_standard || 0,
              percentile: student.korean_percentile || 0,
            },
            math: {
              standard: student.math_standard || 0,
              percentile: student.math_percentile || 0,
            },
            english: { grade: student.english_grade || 9 },
            inquiry1: {
              subject: student.inquiry1_subject || '',
              standard: student.inquiry1_standard || 0,
              percentile: student.inquiry1_percentile || 0,
            },
            inquiry2: {
              subject: student.inquiry2_subject || '',
              standard: student.inquiry2_standard || 0,
              percentile: student.inquiry2_percentile || 0,
            },
            history: { grade: student.history_grade || 9 },
          },
          suneung_score: parseFloat(student.suneung_score) || 0,
          practical_score: parseFloat(student.practical_score) || 0,
          practical_records: practicalRecords,
          total_score: parseFloat(student.total_score) || 0,
        };
      });

      // 4. 통계 계산
      const scores = applicants.map((a) => a.total_score);
      const stats = {
        total_count: applicants.length,
        avg_score: scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : 0,
        max_score: scores.length > 0 ? Math.max(...scores) : 0,
        min_score: scores.length > 0 ? Math.min(...scores) : 0,
      };

      return NextResponse.json({
        success: true,
        university: {
          U_ID: university.U_ID,
          대학명: university.대학명,
          학과명: university.학과명,
          군: university.군,
        },
        applicants,
        stats,
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Applicants GET error:', error);
    return NextResponse.json(
      { success: false, message: '지원자 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}
