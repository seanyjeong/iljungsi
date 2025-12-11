import { query } from './db';

/**
 * 연도별 데이터 조회 - Fallback 로직
 * 요청한 연도에 데이터가 없으면 이전 연도 데이터로 대체
 */
export async function getWithFallback<T = any>(
  table: string,
  year: number,
  additionalCondition?: string,
  params?: any[]
): Promise<{ data: T[]; actualYear: number }> {
  const condition = additionalCondition
    ? `학년도 = ? AND ${additionalCondition}`
    : '학년도 = ?';

  // 1. 요청한 연도로 먼저 조회
  let result = await query<T>(
    `SELECT * FROM \`${table}\` WHERE ${condition}`,
    [year, ...(params || [])]
  );

  if (result.length > 0) {
    return { data: result, actualYear: year };
  }

  // 2. 결과가 없으면 이전 연도로 폴백
  result = await query<T>(
    `SELECT * FROM \`${table}\` WHERE ${condition}`,
    [year - 1, ...(params || [])]
  );

  return { data: result, actualYear: year - 1 };
}

/**
 * 단일 레코드 조회 with Fallback
 */
export async function getOneWithFallback<T = any>(
  table: string,
  year: number,
  additionalCondition?: string,
  params?: any[]
): Promise<{ data: T | null; actualYear: number }> {
  const { data, actualYear } = await getWithFallback<T>(
    table,
    year,
    additionalCondition,
    params
  );
  return { data: data[0] ?? null, actualYear };
}

/**
 * 대학 정보 조회 with Fallback
 */
export async function getUniversityWithFallback(uid: number, year: number) {
  return getOneWithFallback('정시기본', year, 'U_ID = ?', [uid]);
}

/**
 * 반영비율 조회 with Fallback
 */
export async function getRatioWithFallback(uid: number, year: number) {
  return getOneWithFallback('정시반영비율', year, 'U_ID = ?', [uid]);
}

/**
 * 실기배점표 조회 with Fallback
 */
export async function getPracticalTableWithFallback(uid: number, year: number) {
  return getWithFallback('정시실기배점', year, 'U_ID = ?', [uid]);
}

/**
 * 탐구변환표준 조회 with Fallback
 */
export async function getInquiryConvWithFallback(uid: number, year: number) {
  return getWithFallback('정시탐구변환표준', year, 'U_ID = ?', [uid]);
}
