// תיקון 75: "למה המנוע החליט כך" - ה-DTO של השרת (DTOs/DTOs/RouteDecisionDtos.cs)
import type { IsoDateString } from './api';

export type DecisionMode = 'Auto' | 'Single' | 'Manual';
export type CandidateOutcome = 'Chosen' | 'LowerValue' | 'TakenByOtherRoute' | 'NoRoute' | 'NotEvaluated';

export interface DecisionWeightsDto {
  distance: number;
  urgency: number;
  capacity: number;
  reliability: number;
}

export interface DecisionFunnelStepDto {
  label: string;
  algorithm: string;
  count: number;
}

/** כל רכיב 0-1 (לפני שקלול), total - הציון המשוקלל 0-1 */
export interface DecisionScoreDto extends DecisionWeightsDto {
  total: number;
}

export interface DecisionCandidateDto {
  volunteerId: number;
  name: string;
  rank: number;
  distanceKm: number;
  score: DecisionScoreDto;
  outcome: CandidateOutcome | string;
  reason: string | null;
  routeValue: number | null;
  routeScore: number | null;
  stops: number | null;
}

export interface DecisionStopDto {
  order: number;
  donationId: number;
  isAnchor: boolean;
  weightKg: number;
  estimatedArrival: IsoDateString | null;
  supplierName: string | null;
}

export interface DecisionRouteDto {
  ngoName: string | null;
  departure: IsoDateString;
  ngoArrival: IsoDateString;
  distanceKm: number;
  durationMinutes: number;
  weightKg: number;
  knapsackValue: number;
  knapsackOptimal: boolean;
  matchScore: number;
  value: number;
  ngosConsidered: number;
  extraDonationsConsidered: number;
  stops: DecisionStopDto[];
}

export interface DecisionGlobalDto {
  donationsInRun: number;
  candidateRoutes: number;
  routesSelected: number;
  totalValue: number;
  greedyValue: number;
  upperBound: number;
  gapPercent: number;
  nodes: number;
  provedOptimal: boolean;
}

/** GET api/matches/decisions/{routeId} */
export interface RouteDecisionDto {
  version: number;
  routeId: number;
  routeStatus: string | null;
  volunteerName: string | null;
  mode: DecisionMode | string;
  decidedAt: IsoDateString;
  anchorDonationId: number;
  anchorWeightKg: number;
  anchorUrgency: number;
  note: string | null;
  maxSearchRadiusKm: number;
  weights: DecisionWeightsDto;
  funnel: DecisionFunnelStepDto[];
  candidates: DecisionCandidateDto[];
  route: DecisionRouteDto;
  global: DecisionGlobalDto | null;
}

/** GET api/matches/decisions */
export interface RouteDecisionSummaryDto {
  routeId: number;
  decidedAt: IsoDateString;
  mode: DecisionMode | string;
  routeStatus: string | null;
  volunteerName: string | null;
  ngoName: string | null;
  donationIds: number[];
  weightKg: number;
  matchScore: number;
  volunteersConsidered: number;
  candidatesShown: number;
}

export const MODE_LABELS: Record<string, string> = {
  Auto: 'ריצה אוטומטית',
  Single: 'שיבוץ של תרומה אחת',
  Manual: 'שיבוץ ידני',
};

export const ROUTE_STATUS_LABELS: Record<string, string> = {
  Planned: 'מתוכנן',
  InProgress: 'בדרך',
  Completed: 'הושלם',
  Cancelled: 'בוטל',
};
