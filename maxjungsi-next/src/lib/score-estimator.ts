/**
 * 점수 추정 유틸리티
 * 원점수에서 표준점수/백분위를 선형 보간법으로 계산
 */

interface GradeCutRow {
  원점수: number | string;
  표준점수: number | string;
  백분위: number | string;
  등급: number | string;
}

interface InterpolatedScore {
  std: number;
  pct: number;
  grade: number;
}

/**
 * 원점수에 해당하는 예상 표준점수와 백분위를 선형 보간법으로 계산
 */
export function interpolateScore(
  rawScore: number,
  gradeCutTable: GradeCutRow[]
): InterpolatedScore {
  if (!gradeCutTable || gradeCutTable.length === 0) {
    return { std: 0, pct: 0, grade: 9 };
  }

  // 테이블 정렬 (원점수 내림차순)
  const sortedCuts = [...gradeCutTable]
    .map((c) => ({
      raw: Number(c.원점수),
      std: Number(c.표준점수),
      pct: Number(c.백분위),
      grade: Number(c.등급),
    }))
    .sort((a, b) => b.raw - a.raw);

  const maxScore = sortedCuts[0];
  const minScore = sortedCuts[sortedCuts.length - 1];

  // 엣지 케이스 처리
  if (rawScore >= maxScore.raw) {
    return { std: maxScore.std, pct: maxScore.pct, grade: maxScore.grade };
  }
  if (rawScore <= minScore.raw) {
    return { std: minScore.std, pct: minScore.pct, grade: minScore.grade };
  }

  // 샌드위치 구간 찾기
  let upper = maxScore;
  let lower = maxScore;

  for (let i = 1; i < sortedCuts.length; i++) {
    if (sortedCuts[i].raw === rawScore) {
      const exactCut = sortedCuts[i];
      return { std: exactCut.std, pct: exactCut.pct, grade: exactCut.grade };
    }

    if (sortedCuts[i].raw < rawScore) {
      upper = sortedCuts[i - 1];
      lower = sortedCuts[i];
      break;
    }
  }

  // 선형 보간법
  const rawRange = upper.raw - lower.raw;
  const rawOffset = rawScore - lower.raw;

  if (rawRange === 0) {
    return { std: lower.std, pct: lower.pct, grade: lower.grade };
  }

  const position = rawOffset / rawRange;
  const stdRange = upper.std - lower.std;
  const pctRange = upper.pct - lower.pct;

  const estimatedStd = lower.std + stdRange * position;
  const estimatedPct = lower.pct + pctRange * position;

  return {
    std: Math.round(estimatedStd),
    pct: Math.round(estimatedPct),
    grade: lower.grade,
  };
}

/**
 * 영어 원점수 -> 등급 (절대평가)
 */
export function getEnglishGrade(rawScore: number): number {
  const score = Number(rawScore);
  if (score >= 90) return 1;
  if (score >= 80) return 2;
  if (score >= 70) return 3;
  if (score >= 60) return 4;
  if (score >= 50) return 5;
  if (score >= 40) return 6;
  if (score >= 30) return 7;
  if (score >= 20) return 8;
  return 9;
}

/**
 * 한국사 원점수 -> 등급 (절대평가)
 */
export function getHistoryGrade(rawScore: number): number {
  const score = Number(rawScore);
  if (score >= 40) return 1;
  if (score >= 35) return 2;
  if (score >= 30) return 3;
  if (score >= 25) return 4;
  if (score >= 20) return 5;
  if (score >= 15) return 6;
  if (score >= 10) return 7;
  if (score >= 5) return 8;
  return 9;
}
