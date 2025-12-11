/**
 * 실기 점수 계산 로직 (silgical.ts)
 * 원본: /home/sean/maxjungsi222/silgical.js
 */

// ============ 타입 정의 ============

export interface PracticalRecord {
  event?: string;
  종목명?: string;
  record?: number | string;
  value?: number | string;
}

export interface ScoreTableRow {
  종목명: string;
  성별?: 'M' | 'F' | '';
  기록: string | number;
  배점: number;
}

export interface PracticalScoreResult {
  event: string;
  record: number | string;
  score: number;
  maxScore: number;
}

export interface PracticalCalculationResult {
  총점: number;
  종목별점수: PracticalScoreResult[];
  계산로그: string[];
}

// ============ 헬퍼 함수 ============

/**
 * 종목명으로 기록방식 판단
 * - lower_is_better: 시간, 달리기 등 (낮을수록 좋음)
 * - higher_is_better: 거리, 횟수 등 (높을수록 좋음)
 */
export function getEventRules(eventName: string): { method: 'lower_is_better' | 'higher_is_better' } {
  eventName = eventName || '';
  const LOW_IS_BETTER_KEYWORDS = ['m', 'run', '왕복', '초', '벽', '지그', 'z', '달리기'];

  let method: 'lower_is_better' | 'higher_is_better' = 'higher_is_better';

  if (LOW_IS_BETTER_KEYWORDS.some((k) => eventName.toLowerCase().includes(k))) {
    method = 'lower_is_better';
  }

  // 던지기, 멀리뛰기는 높을수록 좋음
  if (eventName.includes('던지기') || eventName.includes('멀리뛰기')) {
    method = 'higher_is_better';
  }

  return { method };
}

/**
 * 배점표에서 해당 종목의 '최고 배점(만점)'을 찾음
 */
export function findMaxScore(scoreTable: ScoreTableRow[]): number {
  if (!scoreTable || scoreTable.length === 0) return 0;

  const max = scoreTable
    .map((l) => Number(l.배점))
    .filter((n) => !Number.isNaN(n))
    .reduce((m, cur) => Math.max(m, cur), 0);

  return max;
}

/**
 * 배점표에서 '순수 숫자 최하점'을 찾음 (F, P 등 제외)
 */
export function findMinScore(scoreTable: ScoreTableRow[]): string {
  if (!scoreTable || scoreTable.length === 0) return '0';

  const keywordsToIgnore = ['F', 'G', '미응시', '파울', '실격', 'P', 'PASS'];
  const allScores: number[] = [];

  for (const level of scoreTable) {
    const recordStr = String(level.기록).trim().toUpperCase();

    if (keywordsToIgnore.includes(recordStr)) {
      continue;
    }

    const score = Number(level.배점);
    if (!Number.isNaN(score)) {
      allScores.push(score);
    }
  }

  if (allScores.length > 0) {
    return String(Math.min(...allScores));
  } else {
    return '0';
  }
}

/**
 * 학생 기록으로 '배점 등급' 찾기
 */
export function lookupScore(
  studentRecord: number | string,
  method: 'lower_is_better' | 'higher_is_better',
  scoreTable: ScoreTableRow[],
  outOfRangeRule: string = '0점'
): string {
  if (!scoreTable || scoreTable.length === 0) {
    return '0';
  }

  const studentValueStr = String(studentRecord).trim().toUpperCase();

  // F/G/미응시 등은 최하점 처리
  const FORCE_MIN_SCORE_KEYWORDS = ['F', 'G', '미응시', '파울', '실격'];
  if (FORCE_MIN_SCORE_KEYWORDS.includes(studentValueStr)) {
    return findMinScore(scoreTable);
  }

  const studentValueNum = Number(studentValueStr);
  const isNumericInput = !Number.isNaN(studentValueNum) && studentValueStr !== '';

  const numericLevels: { record: number; grade: number }[] = [];
  const exactMatchLevels = new Map<string, number>();
  const rangeLevels: { rangeStr: string; grade: number }[] = [];

  for (const level of scoreTable) {
    const recordStr = String(level.기록).trim();
    const recordNum = Number(recordStr);

    if (!Number.isNaN(recordNum) && recordStr !== '') {
      numericLevels.push({ record: recordNum, grade: level.배점 });
    } else if (
      recordStr.includes('이상') ||
      recordStr.includes('이하') ||
      recordStr.includes('초과') ||
      recordStr.includes('미만')
    ) {
      rangeLevels.push({ rangeStr: recordStr, grade: level.배점 });
    } else {
      exactMatchLevels.set(recordStr.toUpperCase(), level.배점);
    }
  }

  // 1순위: 문자(P/F 등) 일치
  if (exactMatchLevels.has(studentValueStr)) {
    return String(exactMatchLevels.get(studentValueStr));
  }

  if (isNumericInput) {
    // 2순위: "200 이상" 같은 범위
    for (const level of rangeLevels) {
      const parts = level.rangeStr.match(/([0-9.]+)\s*(이상|이하|초과|미만)/);
      if (parts && parts[1]) {
        const limit = Number(parts[1]);
        const type = parts[2];
        if (type === '이상' && studentValueNum >= limit) return String(level.grade);
        if (type === '이하' && studentValueNum <= limit) return String(level.grade);
        if (type === '초과' && studentValueNum > limit) return String(level.grade);
        if (type === '미만' && studentValueNum < limit) return String(level.grade);
      }
    }

    // 3순위: 단순 숫자 비교
    if (numericLevels.length > 0) {
      if (method === 'lower_is_better') {
        // 낮을수록 좋음: 내림차순 정렬 후 학생 기록보다 큰 것 중 첫 번째
        numericLevels.sort((a, b) => b.record - a.record);
        for (const level of numericLevels) {
          if (studentValueNum <= level.record) {
            return String(level.grade);
          }
        }
        // 범위 초과 시 최하점
        return String(numericLevels[numericLevels.length - 1].grade);
      } else {
        // 높을수록 좋음: 내림차순 정렬 후 학생 기록보다 작은 것 중 첫 번째
        numericLevels.sort((a, b) => b.record - a.record);
        for (const level of numericLevels) {
          if (studentValueNum >= level.record) {
            return String(level.grade);
          }
        }
        // 범위 미달 시 최하점
        return String(numericLevels[numericLevels.length - 1].grade);
      }
    }
  }

  // 매칭 실패 시 기본값
  if (outOfRangeRule === '최하점') {
    return findMinScore(scoreTable);
  }
  return '0';
}

/**
 * 학생 실기기록을 대학 실기배점표와 매칭해서 "종목별 점수 배열"로 반환
 */
export function buildPracticalScoreList(
  studentRecords: PracticalRecord[],
  scoreTable: ScoreTableRow[],
  studentGender: 'M' | 'F' | '' = ''
): PracticalScoreResult[] {
  const out: PracticalScoreResult[] = [];

  for (const rec of studentRecords) {
    const eventName = rec.event || rec.종목명;
    if (!eventName) continue;

    // 해당 종목 + 성별 필터
    const tableForEvent = scoreTable.filter((row) => {
      if (studentGender && row.성별 && row.성별 !== studentGender) return false;
      return row.종목명 === eventName;
    });

    const { method } = getEventRules(eventName);
    const studentRawRecord = rec.record !== undefined ? rec.record : rec.value;

    const score = lookupScore(studentRawRecord || '', method, tableForEvent, '0점');
    const maxScore = findMaxScore(tableForEvent);

    out.push({
      event: eventName,
      record: studentRawRecord || '',
      score: Number(score || 0),
      maxScore: Number(maxScore || 100),
    });
  }

  return out;
}

/**
 * 실기 총점 계산
 */
export function calculatePracticalScore(
  studentRecords: PracticalRecord[],
  scoreTable: ScoreTableRow[],
  studentGender: 'M' | 'F' | '' = '',
  practicalTotal: number = 100
): PracticalCalculationResult {
  const log: string[] = [];

  const scoreList = buildPracticalScoreList(studentRecords, scoreTable, studentGender);

  let totalScore = 0;
  let totalMaxScore = 0;

  for (const item of scoreList) {
    totalScore += item.score;
    totalMaxScore += item.maxScore;
    log.push(`[${item.event}] 기록: ${item.record}, 배점: ${item.score}/${item.maxScore}`);
  }

  // 실기 반영 총점으로 환산
  const 환산총점 = totalMaxScore > 0
    ? (totalScore / totalMaxScore) * practicalTotal
    : 0;

  log.push(`[실기 총점] ${totalScore}/${totalMaxScore} → 환산: ${환산총점.toFixed(2)}/${practicalTotal}`);

  return {
    총점: Math.round(환산총점 * 100) / 100,
    종목별점수: scoreList,
    계산로그: log,
  };
}
