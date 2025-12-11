export interface Student {
  student_id: number;
  student_name: string;
  school_name: string;
  gender: 'M' | 'F';
  branch_name: string;
  학년도: number;
  account_id?: number;
}

export interface StudentScore {
  student_id: number;
  학년도: number;
  // 국어
  국어_표점?: number;
  국어_백분?: number;
  국어_원점?: number;
  // 수학
  수학_표점?: number;
  수학_백분?: number;
  수학_원점?: number;
  // 영어
  영어_등급?: number;
  영어_원점?: number;
  // 탐구1
  탐구1_과목?: string;
  탐구1_표점?: number;
  탐구1_백분?: number;
  탐구1_원점?: number;
  // 탐구2
  탐구2_과목?: string;
  탐구2_표점?: number;
  탐구2_백분?: number;
  탐구2_원점?: number;
  // 한국사
  한국사_등급?: number;
  한국사_원점?: number;
  // 가채점 여부
  is_official?: boolean;
}

export interface StudentWithScore extends Student {
  scores?: StudentScore;
}
