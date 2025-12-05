/**
 * 개발 환경 체크 유틸리티
 * 
 * ⚠️ 보안 주의사항:
 * - 이 유틸리티는 서버 사이드에서만 사용해야 합니다
 * - 클라이언트에 환경 변수가 노출되지 않도록 주의
 * - 프로덕션에서 개발 전용 기능이 실행되지 않도록 보호
 */

/**
 * 개발 환경인지 체크
 * NODE_ENV가 'development'인지 확인
 * 
 * @returns 개발 환경이면 true, 아니면 false
 */
export function isDevelopmentMode(): boolean {
  // 서버 사이드에서만 동작
  if (typeof process === 'undefined') {
    return false;
  }
  
  return process.env.NODE_ENV === 'development';
}

/**
 * 개발 어드민 페이지 활성화 여부 체크
 * 
 * 개발 환경이거나 ENABLE_DEV_ADMIN 환경 변수가 'true'인 경우 활성화
 * 
 * @returns 개발 어드민이 활성화되어 있으면 true, 아니면 false
 */
export function isDevAdminEnabled(): boolean {
  // 서버 사이드에서만 동작
  if (typeof process === 'undefined') {
    return false;
  }
  
  // 개발 환경이면 항상 활성화
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  
  // 환경 변수로 명시적으로 활성화된 경우
  return process.env.ENABLE_DEV_ADMIN === 'true';
}

/**
 * 개발 환경에서만 실행되는 함수 래퍼
 * 
 * @param fn - 실행할 함수
 * @param errorMessage - 프로덕션에서 실행 시 표시할 에러 메시지
 * @returns 함수 실행 결과 또는 에러
 */
export function devOnly<T>(
  fn: () => T,
  errorMessage: string = 'This function is only available in development mode'
): T {
  if (!isDevAdminEnabled()) {
    throw new Error(errorMessage);
  }
  
  return fn();
}






