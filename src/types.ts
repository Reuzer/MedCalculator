export type PregnancyResult = {
    gestAgeDays: number;
    weeks: number;
    days: number;
    trimester: 1 | 2 | 3;
    eddISO: string; // YYYY-MM-DD
  };
  
  export type CalcRecord = {
    id: string;
    createdAtISO: string; // ISO datetime
    lmpISO: string; // YYYY-MM-DD
    cycleLength: number;
    result: PregnancyResult;
    recommendationText?: string;
  };
  