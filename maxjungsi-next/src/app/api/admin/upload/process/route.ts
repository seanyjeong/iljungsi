import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getTokenFromRequest } from '@/lib/auth';
import * as XLSX from 'xlsx';

// 테이블별 필수 컬럼 정의
const REQUIRED_COLUMNS: Record<string, string[]> = {
  정시기본: ['학년도', 'U_ID', '대학명', '학과명'],
  정시반영비율: ['학년도', 'U_ID'],
  정시실기배점: ['학년도', 'U_ID', '종목명', '기록', '배점'],
  정시탐구변환표준: ['학년도', 'U_ID', '계열', '백분위', '변환표준점수'],
  정시예상등급컷: ['학년도', '모형', '선택과목명', '등급'],
  정시최고표점: ['학년도', '모형', '과목명', '최고점'],
  학생기본정보: ['학년도', 'student_id', 'student_name'],
  학생수능성적: ['학년도', 'student_id'],
  공지사항: ['제목', '내용'],
};

// POST: 엑셀 파일 업로드 및 처리
export async function POST(request: Request) {
  try {
    const user = getTokenFromRequest(request);
    if (!user || user.userid !== 'admin') {
      return NextResponse.json(
        { success: false, message: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const table = formData.get('table') as string;
    const mode = formData.get('mode') as string; // 'preview' or 'execute'

    if (!file) {
      return NextResponse.json(
        { success: false, message: '파일이 필요합니다.' },
        { status: 400 }
      );
    }

    if (!table || !REQUIRED_COLUMNS[table]) {
      return NextResponse.json(
        { success: false, message: '올바른 테이블을 선택해주세요.' },
        { status: 400 }
      );
    }

    // 파일 읽기
    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws) as Record<string, any>[];

    if (data.length === 0) {
      return NextResponse.json(
        { success: false, message: '데이터가 없습니다.' },
        { status: 400 }
      );
    }

    // 필수 컬럼 검증
    const columns = Object.keys(data[0]);
    const requiredCols = REQUIRED_COLUMNS[table];
    const missingCols = requiredCols.filter((col) => !columns.includes(col));

    if (missingCols.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `필수 컬럼이 없습니다: ${missingCols.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // 미리보기 모드
    if (mode === 'preview') {
      return NextResponse.json({
        success: true,
        preview: {
          columns,
          totalRows: data.length,
          sampleData: data.slice(0, 10),
        },
      });
    }

    // 실행 모드 - DB 업데이트
    let insertedCount = 0;
    let updatedCount = 0;
    const errors: string[] = [];

    // 트랜잭션 시작
    const connection = await (await import('@/lib/db')).getConnection();
    await connection.beginTransaction();

    try {
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowNum = i + 2; // 엑셀 행 번호 (헤더 제외)

        try {
          // 테이블별 UPSERT 처리
          const result = await processRow(table, row, connection);
          if (result.inserted) {
            insertedCount++;
          } else {
            updatedCount++;
          }
        } catch (error: any) {
          errors.push(`행 ${rowNum}: ${error.message}`);
          if (errors.length > 10) {
            errors.push('...오류가 너무 많습니다. 처리를 중단합니다.');
            throw new Error('Too many errors');
          }
        }
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return NextResponse.json({
      success: errors.length === 0,
      message:
        errors.length === 0
          ? `처리 완료: ${insertedCount}개 추가, ${updatedCount}개 수정`
          : `일부 오류 발생`,
      insertedCount,
      updatedCount,
      errors,
    });
  } catch (error) {
    console.error('Upload process error:', error);
    return NextResponse.json(
      { success: false, message: '업로드 처리에 실패했습니다.' },
      { status: 500 }
    );
  }
}

// 테이블별 행 처리
async function processRow(
  table: string,
  row: Record<string, any>,
  connection: any
): Promise<{ inserted: boolean }> {
  switch (table) {
    case '정시기본':
      return processJungsiBasic(row, connection);
    case '정시반영비율':
      return processJungsiFormula(row, connection);
    case '정시실기배점':
      return processSilgiScore(row, connection);
    case '정시탐구변환표준':
      return processInquiryConversion(row, connection);
    case '정시예상등급컷':
      return processGradeCut(row, connection);
    case '정시최고표점':
      return processHighestScore(row, connection);
    case '학생기본정보':
      return processStudentInfo(row, connection);
    case '학생수능성적':
      return processStudentScore(row, connection);
    case '공지사항':
      return processNotice(row, connection);
    default:
      throw new Error('지원하지 않는 테이블입니다.');
  }
}

// 정시기본 처리
async function processJungsiBasic(row: Record<string, any>, conn: any) {
  const [existing] = await conn.query(
    'SELECT U_ID FROM `정시기본` WHERE U_ID = ? AND 학년도 = ?',
    [row.U_ID, row.학년도]
  );

  if (existing.length > 0) {
    await conn.query(
      `UPDATE \`정시기본\` SET
        대학명 = ?, 학과명 = ?, 군 = ?, 지역 = ?, 모집정원 = ?,
        선발방식 = ?, 전형명 = ?, 비고 = ?
       WHERE U_ID = ? AND 학년도 = ?`,
      [
        row.대학명,
        row.학과명,
        row.군 || '',
        row.지역 || '',
        row.모집정원 || null,
        row.선발방식 || '',
        row.전형명 || '',
        row.비고 || '',
        row.U_ID,
        row.학년도,
      ]
    );
    return { inserted: false };
  } else {
    await conn.query(
      `INSERT INTO \`정시기본\` (학년도, U_ID, 대학명, 학과명, 군, 지역, 모집정원, 선발방식, 전형명, 비고)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        row.학년도,
        row.U_ID,
        row.대학명,
        row.학과명,
        row.군 || '',
        row.지역 || '',
        row.모집정원 || null,
        row.선발방식 || '',
        row.전형명 || '',
        row.비고 || '',
      ]
    );
    return { inserted: true };
  }
}

// 정시반영비율 처리
async function processJungsiFormula(row: Record<string, any>, conn: any) {
  const [existing] = await conn.query(
    'SELECT U_ID FROM `정시반영비율` WHERE U_ID = ? AND 학년도 = ?',
    [row.U_ID, row.학년도]
  );

  if (existing.length > 0) {
    await conn.query(
      `UPDATE \`정시반영비율\` SET
        총점 = ?, 수능 = ?, 내신 = ?, 실기 = ?,
        국어 = ?, 수학 = ?, 영어 = ?, 탐구 = ?, 한국사 = ?,
        score_config = ?, english_scores = ?, history_scores = ?,
        bonus_rules = ?, selection_rules = ?, 특수공식 = ?
       WHERE U_ID = ? AND 학년도 = ?`,
      [
        row.총점 || 1000,
        row.수능 || 0,
        row.내신 || 0,
        row.실기 || 0,
        row.국어 || 0,
        row.수학 || 0,
        row.영어 || 0,
        row.탐구 || 0,
        row.한국사 || 0,
        row.score_config || null,
        row.english_scores || null,
        row.history_scores || null,
        row.bonus_rules || null,
        row.selection_rules || null,
        row.특수공식 || null,
        row.U_ID,
        row.학년도,
      ]
    );
    return { inserted: false };
  } else {
    await conn.query(
      `INSERT INTO \`정시반영비율\` (학년도, U_ID, 총점, 수능, 내신, 실기, 국어, 수학, 영어, 탐구, 한국사, score_config, english_scores, history_scores, bonus_rules, selection_rules, 특수공식)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        row.학년도,
        row.U_ID,
        row.총점 || 1000,
        row.수능 || 0,
        row.내신 || 0,
        row.실기 || 0,
        row.국어 || 0,
        row.수학 || 0,
        row.영어 || 0,
        row.탐구 || 0,
        row.한국사 || 0,
        row.score_config || null,
        row.english_scores || null,
        row.history_scores || null,
        row.bonus_rules || null,
        row.selection_rules || null,
        row.특수공식 || null,
      ]
    );
    return { inserted: true };
  }
}

// 실기배점 처리
async function processSilgiScore(row: Record<string, any>, conn: any) {
  const [existing] = await conn.query(
    'SELECT id FROM `정시실기배점` WHERE U_ID = ? AND 학년도 = ? AND 종목명 = ? AND 성별 = ? AND 기록 = ?',
    [row.U_ID, row.학년도, row.종목명, row.성별 || '', row.기록]
  );

  if (existing.length > 0) {
    await conn.query('UPDATE `정시실기배점` SET 배점 = ? WHERE id = ?', [row.배점, existing[0].id]);
    return { inserted: false };
  } else {
    await conn.query(
      `INSERT INTO \`정시실기배점\` (학년도, U_ID, 종목명, 성별, 기록, 배점)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [row.학년도, row.U_ID, row.종목명, row.성별 || '', row.기록, row.배점]
    );
    return { inserted: true };
  }
}

// 탐구변환 처리
async function processInquiryConversion(row: Record<string, any>, conn: any) {
  const [existing] = await conn.query(
    'SELECT id FROM `정시탐구변환표준` WHERE U_ID = ? AND 학년도 = ? AND 계열 = ? AND 백분위 = ?',
    [row.U_ID, row.학년도, row.계열, row.백분위]
  );

  if (existing.length > 0) {
    await conn.query('UPDATE `정시탐구변환표준` SET 변환표준점수 = ? WHERE id = ?', [
      row.변환표준점수,
      existing[0].id,
    ]);
    return { inserted: false };
  } else {
    await conn.query(
      `INSERT INTO \`정시탐구변환표준\` (학년도, U_ID, 계열, 백분위, 변환표준점수)
       VALUES (?, ?, ?, ?, ?)`,
      [row.학년도, row.U_ID, row.계열, row.백분위, row.변환표준점수]
    );
    return { inserted: true };
  }
}

// 등급컷 처리
async function processGradeCut(row: Record<string, any>, conn: any) {
  const [existing] = await conn.query(
    'SELECT id FROM `정시예상등급컷` WHERE 학년도 = ? AND 모형 = ? AND 선택과목명 = ? AND 등급 = ?',
    [row.학년도, row.모형, row.선택과목명, row.등급]
  );

  if (existing.length > 0) {
    await conn.query(
      'UPDATE `정시예상등급컷` SET 원점수 = ?, 표준점수 = ?, 백분위 = ? WHERE id = ?',
      [row.원점수 || null, row.표준점수 || null, row.백분위 || null, existing[0].id]
    );
    return { inserted: false };
  } else {
    await conn.query(
      `INSERT INTO \`정시예상등급컷\` (학년도, 모형, 선택과목명, 등급, 원점수, 표준점수, 백분위)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [row.학년도, row.모형, row.선택과목명, row.등급, row.원점수 || null, row.표준점수 || null, row.백분위 || null]
    );
    return { inserted: true };
  }
}

// 최고표점 처리
async function processHighestScore(row: Record<string, any>, conn: any) {
  const [existing] = await conn.query(
    'SELECT id FROM `정시최고표점` WHERE 학년도 = ? AND 모형 = ? AND 과목명 = ?',
    [row.학년도, row.모형, row.과목명]
  );

  if (existing.length > 0) {
    await conn.query(
      'UPDATE `정시최고표점` SET 최고점 = ?, updated_at = NOW() WHERE id = ?',
      [row.최고점, existing[0].id]
    );
    return { inserted: false };
  } else {
    await conn.query(
      `INSERT INTO \`정시최고표점\` (학년도, 모형, 과목명, 최고점)
       VALUES (?, ?, ?, ?)`,
      [row.학년도, row.모형, row.과목명, row.최고점]
    );
    return { inserted: true };
  }
}

// 학생기본정보 처리
async function processStudentInfo(row: Record<string, any>, conn: any) {
  const [existing] = await conn.query(
    'SELECT student_id FROM `학생기본정보` WHERE student_id = ? AND 학년도 = ?',
    [row.student_id, row.학년도]
  );

  if (existing.length > 0) {
    await conn.query(
      `UPDATE \`학생기본정보\` SET
        student_name = ?, school_name = ?, gender = ?, branch_name = ?,
        phone_number = ?, phone_owner = ?
       WHERE student_id = ? AND 학년도 = ?`,
      [
        row.student_name,
        row.school_name || null,
        row.gender || 'M',
        row.branch_name || null,
        row.phone_number || null,
        row.phone_owner || null,
        row.student_id,
        row.학년도,
      ]
    );
    return { inserted: false };
  } else {
    await conn.query(
      `INSERT INTO \`학생기본정보\` (학년도, student_id, student_name, school_name, gender, branch_name, phone_number, phone_owner)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        row.학년도,
        row.student_id,
        row.student_name,
        row.school_name || null,
        row.gender || 'M',
        row.branch_name || null,
        row.phone_number || null,
        row.phone_owner || null,
      ]
    );
    return { inserted: true };
  }
}

// 학생수능성적 처리
async function processStudentScore(row: Record<string, any>, conn: any) {
  const [existing] = await conn.query(
    'SELECT student_id FROM `학생수능성적` WHERE student_id = ? AND 학년도 = ?',
    [row.student_id, row.학년도]
  );

  if (existing.length > 0) {
    await conn.query(
      `UPDATE \`학생수능성적\` SET
        국어_표점 = ?, 국어_백분 = ?, 국어_원점 = ?,
        수학_표점 = ?, 수학_백분 = ?, 수학_원점 = ?,
        영어_등급 = ?, 영어_원점 = ?,
        탐구1_과목 = ?, 탐구1_표점 = ?, 탐구1_백분 = ?, 탐구1_원점 = ?,
        탐구2_과목 = ?, 탐구2_표점 = ?, 탐구2_백분 = ?, 탐구2_원점 = ?,
        한국사_등급 = ?, 한국사_원점 = ?,
        is_official = ?
       WHERE student_id = ? AND 학년도 = ?`,
      [
        row.국어_표점 || null, row.국어_백분 || null, row.국어_원점 || null,
        row.수학_표점 || null, row.수학_백분 || null, row.수학_원점 || null,
        row.영어_등급 || null, row.영어_원점 || null,
        row.탐구1_과목 || null, row.탐구1_표점 || null, row.탐구1_백분 || null, row.탐구1_원점 || null,
        row.탐구2_과목 || null, row.탐구2_표점 || null, row.탐구2_백분 || null, row.탐구2_원점 || null,
        row.한국사_등급 || null, row.한국사_원점 || null,
        row.is_official || 0,
        row.student_id,
        row.학년도,
      ]
    );
    return { inserted: false };
  } else {
    await conn.query(
      `INSERT INTO \`학생수능성적\` (
        학년도, student_id,
        국어_표점, 국어_백분, 국어_원점,
        수학_표점, 수학_백분, 수학_원점,
        영어_등급, 영어_원점,
        탐구1_과목, 탐구1_표점, 탐구1_백분, 탐구1_원점,
        탐구2_과목, 탐구2_표점, 탐구2_백분, 탐구2_원점,
        한국사_등급, 한국사_원점,
        is_official
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        row.학년도, row.student_id,
        row.국어_표점 || null, row.국어_백분 || null, row.국어_원점 || null,
        row.수학_표점 || null, row.수학_백분 || null, row.수학_원점 || null,
        row.영어_등급 || null, row.영어_원점 || null,
        row.탐구1_과목 || null, row.탐구1_표점 || null, row.탐구1_백분 || null, row.탐구1_원점 || null,
        row.탐구2_과목 || null, row.탐구2_표점 || null, row.탐구2_백분 || null, row.탐구2_원점 || null,
        row.한국사_등급 || null, row.한국사_원점 || null,
        row.is_official || 0,
      ]
    );
    return { inserted: true };
  }
}

// 공지사항 처리
async function processNotice(row: Record<string, any>, conn: any) {
  if (row.id) {
    const [existing] = await conn.query(
      'SELECT id FROM `공지사항` WHERE id = ?',
      [row.id]
    );

    if (existing.length > 0) {
      await conn.query(
        'UPDATE `공지사항` SET 제목 = ?, 내용 = ?, 작성자 = ? WHERE id = ?',
        [row.제목, row.내용, row.작성자 || 'admin', row.id]
      );
      return { inserted: false };
    }
  }

  await conn.query(
    `INSERT INTO \`공지사항\` (제목, 내용, 작성자, 작성일)
     VALUES (?, ?, ?, NOW())`,
    [row.제목, row.내용, row.작성자 || 'admin']
  );
  return { inserted: true };
}
