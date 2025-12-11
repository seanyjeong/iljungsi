import { NextResponse } from 'next/server';
import { getTokenFromRequest } from '@/lib/auth';
import * as XLSX from 'xlsx';

// 엑셀 템플릿 정의 - 27년도 업로드에 필요한 모든 테이블
const TEMPLATES: Record<string, { columns: string[]; example: Record<string, any>; description: string }> = {
  정시기본: {
    columns: [
      '학년도',
      'U_ID',
      '대학명',
      '학과명',
      '군',
      '지역',
      '모집정원',
      '선발방식',
      '전형명',
      '비고',
    ],
    example: {
      학년도: 2027,
      U_ID: 1001,
      대학명: '서울대학교',
      학과명: '체육교육과',
      군: '가',
      지역: '서울',
      모집정원: 30,
      선발방식: '일괄합산',
      전형명: '정시',
      비고: '',
    },
    description: '대학/학과 기본 정보 (필수)',
  },
  정시반영비율: {
    columns: [
      '학년도',
      'U_ID',
      '총점',
      '수능',
      '내신',
      '실기',
      '국어',
      '수학',
      '영어',
      '탐구',
      '한국사',
      '계산유형',
      '계산방식',
      '미달처리',
      '기타설정',
      'score_config',
      'english_scores',
      'history_scores',
      'bonus_rules',
      'selection_rules',
      '특수공식',
    ],
    example: {
      학년도: 2027,
      U_ID: 1001,
      총점: 1000,
      수능: 40,
      내신: 0,
      실기: 60,
      국어: 25,
      수학: 25,
      영어: 25,
      탐구: 25,
      한국사: 0,
      계산유형: '일반',
      계산방식: '',
      미달처리: '',
      기타설정: '',
      score_config: '{"korean_math":{"type":"백분위"}}',
      english_scores: '{"1":100,"2":95,"3":90,"4":85,"5":80,"6":75,"7":70,"8":65,"9":60}',
      history_scores: '{"1":10,"2":10,"3":10,"4":9,"5":8,"6":7,"7":6,"8":5,"9":4}',
      bonus_rules: '',
      selection_rules: '',
      특수공식: '',
    },
    description: '반영비율 및 계산 설정 (필수)',
  },
  정시실기배점: {
    columns: ['학년도', 'U_ID', '종목명', '성별', '기록', '배점'],
    example: {
      학년도: 2027,
      U_ID: 1001,
      종목명: '100m',
      성별: 'M',
      기록: '11.5',
      배점: 100,
    },
    description: '실기 종목별 배점표',
  },
  정시탐구변환표준: {
    columns: ['학년도', 'U_ID', '계열', '백분위', '변환표준점수'],
    example: {
      학년도: 2027,
      U_ID: 1001,
      계열: '사탐',
      백분위: 100,
      변환표준점수: 70,
    },
    description: '탐구 변환표준점수표 (대학별)',
  },
  정시예상등급컷: {
    columns: ['학년도', '모형', '선택과목명', '등급', '원점수', '표준점수', '백분위'],
    example: {
      학년도: 2027,
      모형: '6모',
      선택과목명: '국어',
      등급: 1,
      원점수: 90,
      표준점수: 140,
      백분위: 96,
    },
    description: '모의고사별 예상 등급컷',
  },
  정시최고표점: {
    columns: ['학년도', '모형', '과목명', '최고점'],
    example: {
      학년도: 2027,
      모형: '6모',
      과목명: '국어',
      최고점: 150,
    },
    description: '모의고사별 과목 최고 표준점수',
  },
  학생기본정보: {
    columns: ['학년도', 'student_id', 'student_name', 'school_name', 'gender', 'branch_name', 'phone_number', 'phone_owner'],
    example: {
      학년도: 2027,
      student_id: 1,
      student_name: '홍길동',
      school_name: '서울고등학교',
      gender: 'M',
      branch_name: '일산',
      phone_number: '010-1234-5678',
      phone_owner: '본인',
    },
    description: '학생 기본 정보',
  },
  학생수능성적: {
    columns: [
      '학년도', 'student_id',
      '국어_표점', '국어_백분', '국어_원점',
      '수학_표점', '수학_백분', '수학_원점',
      '영어_등급', '영어_원점',
      '탐구1_과목', '탐구1_표점', '탐구1_백분', '탐구1_원점',
      '탐구2_과목', '탐구2_표점', '탐구2_백분', '탐구2_원점',
      '한국사_등급', '한국사_원점',
      'is_official'
    ],
    example: {
      학년도: 2027,
      student_id: 1,
      국어_표점: 130,
      국어_백분: 92,
      국어_원점: 85,
      수학_표점: 135,
      수학_백분: 95,
      수학_원점: 88,
      영어_등급: 2,
      영어_원점: 85,
      탐구1_과목: '생활과윤리',
      탐구1_표점: 65,
      탐구1_백분: 90,
      탐구1_원점: 45,
      탐구2_과목: '사회문화',
      탐구2_표점: 68,
      탐구2_백분: 93,
      탐구2_원점: 47,
      한국사_등급: 3,
      한국사_원점: 38,
      is_official: 0,
    },
    description: '학생 수능/모의고사 성적',
  },
  공지사항: {
    columns: ['id', '제목', '내용', '작성자', '작성일'],
    example: {
      id: 1,
      제목: '2027학년도 정시 일정 안내',
      내용: '정시 일정을 안내드립니다.',
      작성자: 'admin',
      작성일: '2027-01-01',
    },
    description: '공지사항',
  },
};

// GET: 엑셀 템플릿 다운로드
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
    const table = searchParams.get('table');

    if (!table || !TEMPLATES[table]) {
      // 템플릿 목록 반환
      const descriptions: Record<string, string> = {};
      for (const [key, val] of Object.entries(TEMPLATES)) {
        descriptions[key] = val.description;
      }
      return NextResponse.json({
        success: true,
        templates: Object.keys(TEMPLATES),
        descriptions,
      });
    }

    // 엑셀 워크북 생성
    const template = TEMPLATES[table];
    const wb = XLSX.utils.book_new();

    // 헤더 + 예시 데이터
    const wsData = [template.columns, template.columns.map((col) => template.example[col] || '')];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // 열 너비 설정
    ws['!cols'] = template.columns.map(() => ({ wch: 15 }));

    XLSX.utils.book_append_sheet(wb, ws, table);

    // 버퍼로 변환
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // 응답
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${table}_template.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Template download error:', error);
    return NextResponse.json(
      { success: false, message: '템플릿 다운로드에 실패했습니다.' },
      { status: 500 }
    );
  }
}
