/**
 * 애플리케이션 전역 상수 정의
 * 
 * @module constants
 */

/**
 * 엔티티 타입 정의
 * 조직(Organization)과 센터(Center)를 구분하는 타입
 */
export const ENTITY_TYPES = {
  ORGANIZATION: 1,
  CENTER: 2, // CENTER가 AGENCY 역할을 겸함
} as const;

export type EntityType = typeof ENTITY_TYPES[keyof typeof ENTITY_TYPES];

/**
 * 위치 증빙의 범주 (Category)
 */
export const PROOF_CATEGORIES = {
  CHECK_IN: 1,  // 출근
  CHECK_OUT: 2, // 퇴근
  GENERAL: 3,   // 일반 위치 증빙
} as const;

export type ProofCategory = typeof PROOF_CATEGORIES[keyof typeof PROOF_CATEGORIES];

/**
 * 위치 증빙의 방식 (Method)
 */
export const PROOF_METHODS = {
  GPS: 1,
  QR: 2,
  INSTANT_QR: 3, // 예: 60초 유효 QR
  SYSTEM: 4,     // 예: 자동 퇴근
} as const;

export type ProofMethod = typeof PROOF_METHODS[keyof typeof PROOF_METHODS];

/**
 * 구독 주기 (Subscription Interval)
 */
export const SUBSCRIPTION_INTERVALS = {
  MONTHLY: 1, // 월간
  YEARLY: 2,  // 연간
} as const;

export type SubscriptionInterval = typeof SUBSCRIPTION_INTERVALS[keyof typeof SUBSCRIPTION_INTERVALS];

/**
 * 구독 상태 (Subscription Status)
 */
export const SUBSCRIPTION_STATUS = {
  ACTIVE: 1,      // 활성
  PAST_DUE: 2,    // 연체 (유예 기간)
  SUSPENDED: 3,   // 정지 (기능 차단)
  CANCELED: 4,    // 취소
} as const;

export type SubscriptionStatus = typeof SUBSCRIPTION_STATUS[keyof typeof SUBSCRIPTION_STATUS];

