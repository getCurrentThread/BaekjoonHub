import { isNull } from "@/commons/util.js";
import { uploadState } from "@/programmers/variables.js";
import { startUpload as commonStartUpload, markUploadedCSS as commonMarkUploaded, markUploadFailedCSS as commonMarkFailed } from "@/commons/ui-util.js";

/**
 * 프로그래머스 전용 유틸리티 함수들
 * 공통 UI 함수들을 래핑하여 플랫폼별 상태 관리를 제공합니다.
 */

/**
 * 업로드 시작 알림 (공통 함수 사용)
 */
export function startUpload() {
  commonStartUpload();
}

/**
 * 업로드 완료 알림 (공통 함수 사용)
 * @param {object} branches - 브랜치 정보
 * @param {string} directory - 디렉토리 정보
 */
export function markUploadedCSS(branches, directory) {
  commonMarkUploaded(branches, directory, uploadState);
}

/**
 * 업로드 실패 알림 (공통 함수 사용)
 */
export function markUploadFailedCSS() {
  commonMarkFailed(uploadState);
}

/**
 * startUpload 함수를 실행합니다.
 * @param {Object} uploadData - 업로드할 문제 정보
 */
export async function executeStartUpload(uploadData) {
  if (isNull(uploadData)) return;
  startUpload();
}

/**
 * 프로그래머스에서 파싱한 데이터 검증
 * @param {Object} data - 파싱된 데이터
 * @returns {boolean} 유효한 데이터인지 여부
 */
export function validateParsedData(data) {
  return !isNull(data) && data.title && data.code;
}