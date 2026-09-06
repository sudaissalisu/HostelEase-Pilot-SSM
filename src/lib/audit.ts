export type Severity = 'LOW' | 'MEDIUM' | 'HIGH'
export const ACTIONS = {
  BED_VACATED: 'BED_VACATED',
  ALLOCATION_CREATED: 'ALLOCATION_CREATED',
  USER_UPDATED: 'USER_UPDATED',
} as const
export async function logAction(_opts: any) { /* no-op in pilot */ }
