import { isNull } from "@/commons/util.js";
import { uploadState } from "@/swexpertacademy/variables.js";
import { startUpload as commonStartUpload, markUploadedCSS as commonMarkUploaded, markUploadFailedCSS as commonMarkFailed } from "@/commons/ui-util.js";

/**
 * SW Expert Academy 전용 유틸리티 함수들
 * 공통 UI 함수들을 래핑하여 플랫폼별 상태 관리를 제공합니다.
 */

/**
 * 업로드 시작 알림 (공통 함수 사용)
 */
export function startUpload() {
  commonStartUpload();
}

/**
 * SWEA 플랫폼에서 접근이 좋은 업로드 버튼 생성
 * @param {string} link - 업로드 시 이동할 링크
 */
export function makeSubmitButton(link) {
  let elem = document.getElementById("BaekjoonHub_submit_button_element");
  if (elem === null) {
    elem = document.createElement("a");
    elem.id = "baekjoonHubSubmitButtonElement";
    elem.className = "btn_grey3 md btn";
    elem.style = "cursor:pointer";
    elem.href = link;
  }
  const target = document.querySelector("body > div.popup_layer.show > div > div");
  if (!isNull(target)) {
    target.append(elem);
  }
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
 * 로그인한 유저의 닉네임을 가져옵니다.
 * @returns {string} 유저 닉네임이며 없을 시에 null을 반환
 */
export function getNickname() {
  return document.querySelector("#Beginner")?.innerText || document.querySelector("header > div > span.name")?.innerText || "";
}