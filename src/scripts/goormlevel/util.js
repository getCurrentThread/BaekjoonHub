/** NOTE: goormlevel에서 사용할 util 모음입니다. */

import { uploadState } from "@scripts/goormlevel/variables.js";
import { startUpload as commonStartUpload, markUploadedCSS as commonMarkUploaded, markUploadFailedCSS as commonMarkFailed } from "@scripts/commons/ui-util.js";

/**
 * 구름레벨 전용 유틸리티 함수들
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
