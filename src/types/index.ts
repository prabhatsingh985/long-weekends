export interface DayPill {
  date: string;
  dayName: string;
  dayNum: string;
  type: 'weekend' | 'holiday' | 'leave' | 'workday';
  label: string;
}

export interface VacationPlan {
  id: string;
  title: string;
  month: string;
  startDate: string;
  endDate: string;
  leavesRequired: number;
  totalDaysOff: number;
  state: string[];
  efficiencyMultiplier: string;
  vibe: string;
  formula: string;
  themes: string[]; // e.g. ['beach', 'party', 'staycation', 'mountains', 'culture', 'international']
  recommendedSpots: string[];
  days: DayPill[];
}

export interface AiInsight {
  query: string;
  summary: string;
  strategy: string;
  recommendedPlaces: string;
  matchedCount: number;
}
