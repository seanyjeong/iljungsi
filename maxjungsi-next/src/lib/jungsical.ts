/**
 * 정시 점수 계산 로직 (jungsical.ts)
 * 원본: /home/sean/maxjungsi222/jungsical.js
 */

// ============ 타입 정의 ============

export interface StudentScore {
  국어?: { std?: number; percentile?: number; subject?: string };
  수학?: { std?: number; percentile?: number; subject?: string };
  영어?: { grade?: number; std?: number };
  탐구?: Array<{
    subject?: string;
    std?: number;
    percentile?: number;
    converted_std?: number;
    group?: string;
  }>;
  한국사?: { grade?: number };
}

export interface UniversityFormula {
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
  총점?: number;
  score_config?: string;
  english_scores?: string;
  history_scores?: string;
  bonus_rules?: string;
  selection_rules?: string;
  특수공식?: string;
}

export interface ScoreConfig {
  korean_math?: {
    type?: string;
    max_score_method?: string;
  };
  inquiry?: {
    type?: string;
    count?: number;
    max_score_method?: string;
  };
  english?: {
    type?: string;
    max_score?: number;
  };
}

export interface CalculationResult {
  총점: number;
  수능점수: number;
  국어점수: number;
  수학점수: number;
  영어점수: number;
  탐구점수: number;
  한국사점수: number;
  계산로그: string[];
}

// ============ 유틸리티 함수 ============

export function safeParse<T>(v: any, fallback: T): T {
  if (v == null) return fallback;
  if (typeof v === 'object') return v;
  try {
    return JSON.parse(v);
  } catch {
    return fallback;
  }
}

export function resolveTotal(F: UniversityFormula): number {
  const t = Number(F?.총점);
  return Number.isFinite(t) && t > 0 ? t : 1000;
}

/**
 * 탐구 과목명으로 사탐/과탐 추측
 */
export function guessInquiryGroup(subject: string): '사탐' | '과탐' {
  const socialKeywords = [
    '생활과윤리', '윤리와사상', '한국지리', '세계지리',
    '동아시아사', '세계사', '경제', '정치와법', '사회문화',
    '생윤', '윤사', '한지', '세지', '동사', '세사', '사문',
  ];

  for (const kw of socialKeywords) {
    if (subject.includes(kw)) return '사탐';
  }
  return '과탐';
}

/**
 * 영어 등급 -> 점수 변환
 */
export function getEnglishScore(
  grade: number,
  englishScores: Record<string, number> | null
): number {
  if (!englishScores || grade == null) return 0;
  return Number(englishScores[String(grade)] ?? 0);
}

/**
 * 한국사 등급 -> 점수 변환
 */
export function getHistoryScore(
  grade: number,
  historyScores: Record<string, number> | null
): number {
  if (!historyScores || grade == null) return 0;
  return Number(historyScores[String(grade)] ?? 0);
}

// ============ 핵심 계산 함수 ============

/**
 * 탐구 대표값 계산 (상위 N개 평균)
 */
export function calcInquiryRepresentative(
  inquiryRows: StudentScore['탐구'],
  type: string,
  inquiryCount: number
): { rep: number; picked: any[] } {
  const key = type === '표준점수' || type === '변환표준점수' ? 'std' : 'percentile';

  const arr = (inquiryRows || [])
    .map((t) => ({
      row: t,
      subject: t?.subject || '탐구',
      val: Number(t?.[key as keyof typeof t] || 0),
    }))
    .sort((a, b) => b.val - a.val);

  if (arr.length === 0) return { rep: 0, picked: [] };

  const n = Math.max(1, inquiryCount || 1);
  const picked = arr.slice(0, Math.min(n, arr.length));
  const rep = picked.reduce((s, x) => s + x.val, 0) / picked.length;

  return { rep, picked };
}

/**
 * 최대 점수 결정 (국/수/영/탐)
 */
export function resolveMaxScores(
  scoreConfig: ScoreConfig | null,
  englishScores: Record<string, number> | null,
  highestMap: Record<string, number> | null,
  S: StudentScore
): { korMax: number; mathMax: number; engMax: number; inqMax: number } {
  const kmType = scoreConfig?.korean_math?.type || '백분위';
  const inqType = scoreConfig?.inquiry?.type || '백분위';
  const kmMethod = scoreConfig?.korean_math?.max_score_method || '';

  let korMax = kmType === '표준점수' || kmMethod === 'fixed_200' ? 200 : 100;
  let mathMax = korMax;
  let inqMax = inqType === '표준점수' || inqType === '변환표준점수' ? 100 : 100;

  // highest_of_year 방식: DB에서 가져온 최고표점 사용
  if (kmMethod === 'highest_of_year' && highestMap) {
    const korKey = S.국어?.subject || '국어';
    const mathKey = S.수학?.subject || '수학';
    if (highestMap[korKey] != null) korMax = Number(highestMap[korKey]);
    if (highestMap[mathKey] != null) mathMax = Number(highestMap[mathKey]);
  }

  // 영어 최대점수
  let engMax = 100;
  if (scoreConfig?.english?.type === 'fixed_max_score' && scoreConfig?.english?.max_score) {
    engMax = Number(scoreConfig.english.max_score);
  } else if (englishScores) {
    const vals = Object.values(englishScores).map(Number).filter((n) => !Number.isNaN(n));
    if (vals.length) engMax = Math.max(...vals);
  }

  return { korMax, mathMax, engMax, inqMax };
}

/**
 * 메인 점수 계산 함수
 */
export function calculateScore(
  F: UniversityFormula,
  S: StudentScore,
  highestMap?: Record<string, number> | null,
  conversionTable?: Record<string, Record<number, number>> | null
): CalculationResult {
  const log: string[] = [];
  const total = resolveTotal(F);
  const suneungRatio = (Number(F.수능) || 0) / 100;

  const scoreConfig = safeParse<ScoreConfig>(F.score_config, {});
  const englishScores = safeParse<Record<string, number>>(F.english_scores, {});
  const historyScores = safeParse<Record<string, number>>(F.history_scores, {});

  log.push(`[기본정보] 총점: ${total}, 수능비율: ${suneungRatio * 100}%`);

  // 최대 점수 결정
  const { korMax, mathMax, engMax, inqMax } = resolveMaxScores(
    scoreConfig,
    englishScores,
    highestMap || null,
    S
  );

  log.push(`[최대점수] 국어: ${korMax}, 수학: ${mathMax}, 영어: ${engMax}, 탐구: ${inqMax}`);

  // 계산 유형 결정
  const kmType = scoreConfig?.korean_math?.type || '백분위';
  const inqType = scoreConfig?.inquiry?.type || '백분위';
  const inqCount = scoreConfig?.inquiry?.count || 2;

  // 국어 점수
  const korRaw = kmType === '표준점수'
    ? Number(S.국어?.std || 0)
    : Number(S.국어?.percentile || 0);
  const korRatio = Number(F.국어 || 0) / 100;
  const 국어점수 = (korRaw / korMax) * total * suneungRatio * korRatio;

  log.push(`[국어] ${kmType}: ${korRaw}, 비율: ${korRatio * 100}%, 점수: ${국어점수.toFixed(2)}`);

  // 수학 점수
  const mathRaw = kmType === '표준점수'
    ? Number(S.수학?.std || 0)
    : Number(S.수학?.percentile || 0);
  const mathRatio = Number(F.수학 || 0) / 100;
  const 수학점수 = (mathRaw / mathMax) * total * suneungRatio * mathRatio;

  log.push(`[수학] ${kmType}: ${mathRaw}, 비율: ${mathRatio * 100}%, 점수: ${수학점수.toFixed(2)}`);

  // 영어 점수 (등급 -> 환산)
  const engGrade = Number(S.영어?.grade || 9);
  const engRaw = getEnglishScore(engGrade, englishScores);
  const engRatio = Number(F.영어 || 0) / 100;
  const 영어점수 = (engRaw / engMax) * total * suneungRatio * engRatio;

  log.push(`[영어] 등급: ${engGrade}, 환산: ${engRaw}, 비율: ${engRatio * 100}%, 점수: ${영어점수.toFixed(2)}`);

  // 탐구 점수
  const inqRatio = Number(F.탐구 || 0) / 100;
  let inqRaw = 0;

  if (inqType === '변환표준점수' && conversionTable) {
    // 변환표준점수 사용
    const inqs = S.탐구 || [];
    const converted = inqs.map((t) => {
      const group = t.group || guessInquiryGroup(t.subject || '');
      const pct = Number(t.percentile || 0);
      const conv = conversionTable[group]?.[pct] || Number(t.std || 0);
      return { ...t, converted_std: conv };
    });
    const { rep } = calcInquiryRepresentative(
      converted.map((c) => ({ ...c, std: c.converted_std })),
      '표준점수',
      inqCount
    );
    inqRaw = rep;
  } else {
    const { rep } = calcInquiryRepresentative(S.탐구, inqType, inqCount);
    inqRaw = rep;
  }

  const 탐구점수 = (inqRaw / inqMax) * total * suneungRatio * inqRatio;

  log.push(`[탐구] ${inqType}: ${inqRaw.toFixed(2)}, 비율: ${inqRatio * 100}%, 점수: ${탐구점수.toFixed(2)}`);

  // 한국사 점수 (등급 -> 환산, 보통 감점/가산)
  const histGrade = Number(S.한국사?.grade || 9);
  const histRaw = getHistoryScore(histGrade, historyScores);
  const histRatio = Number(F.한국사 || 0) / 100;
  const 한국사점수 = histRaw * histRatio;

  log.push(`[한국사] 등급: ${histGrade}, 환산: ${histRaw}, 점수: ${한국사점수.toFixed(2)}`);

  // 수능 총점
  const 수능점수 = 국어점수 + 수학점수 + 영어점수 + 탐구점수 + 한국사점수;
  const 총점 = 수능점수;

  log.push(`[최종] 수능점수: ${수능점수.toFixed(2)}, 총점: ${총점.toFixed(2)}`);

  return {
    총점: Math.round(총점 * 100) / 100,
    수능점수: Math.round(수능점수 * 100) / 100,
    국어점수: Math.round(국어점수 * 100) / 100,
    수학점수: Math.round(수학점수 * 100) / 100,
    영어점수: Math.round(영어점수 * 100) / 100,
    탐구점수: Math.round(탐구점수 * 100) / 100,
    한국사점수: Math.round(한국사점수 * 100) / 100,
    계산로그: log,
  };
}

/**
 * 특수공식 평가 (변수 치환 후 계산)
 */
export function evaluateSpecialFormula(
  formulaText: string,
  ctx: Record<string, number>,
  log: string[]
): number {
  const replaced = String(formulaText || '').replace(/\{([a-z0-9_]+)\}/gi, (_, k) => {
    const v = Number(ctx[k] ?? 0);
    log.push(`[특수공식 변수] ${k} = ${Number.isFinite(v) ? v : 0}`);
    return String(Number.isFinite(v) ? v : 0);
  });

  // 안전한 수식만 허용
  if (!/^[0-9+\-*/().\s]+$/.test(replaced)) {
    throw new Error('특수공식에 허용되지 않은 토큰이 포함되어 있습니다.');
  }

  const val = Function(`"use strict"; return (${replaced});`)();
  return Number(val) || 0;
}
