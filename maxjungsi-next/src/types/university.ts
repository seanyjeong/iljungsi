export interface University {
  U_ID: number;
  학년도: number;
  대학명: string;
  학과명: string;
  군: '가' | '나' | '다';
  광역?: string;
  시구?: string;
  형태?: string;
  입학처?: string;
  교직?: string;
  단계별?: string;
  모집정원?: number;
}

export interface UniversityRatio {
  U_ID: number;
  학년도: number;
  수능: number;
  내신: number;
  실기: number;
  국어: number;
  수학: number;
  영어: number;
  탐구: number;
  한국사: number;
  계산유형?: string;
  score_config?: string;
  english_scores?: string;
  history_scores?: string;
  bonus_rules?: string;
  selection_rules?: string;
  총점?: number;
  기타설정?: string;
  미달처리?: string;
}

export interface PracticalScore {
  U_ID: number;
  학년도: number;
  종목명: string;
  성별: 'M' | 'F';
  기록: string;
  배점: number;
}

export interface InquiryConversion {
  U_ID: number;
  학년도: number;
  계열: '사탐' | '과탐';
  백분위: number;
  변환표준점수: number;
}

export interface Cutoff {
  U_ID: number;
  학년도: number;
  상위10?: number;
  지점컷?: number;
  맥스컷?: number;
}
