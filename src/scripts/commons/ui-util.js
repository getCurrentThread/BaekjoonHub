import React from "react";
import { createRoot } from "react-dom/client";
import { Toast } from "@scripts/commons/platformhub-base.js";
import log from "@scripts/commons/logger.js";
import { ToastSuccessMessage } from "@components/ToastSuccess.jsx";
import { ToastFailureMessage } from "@components/ToastFailure.jsx";

/**
 * 업로드 시작 알림 (공통)
 * 모든 플랫폼에서 사용할 수 있는 통합 시작 알림 함수
 */
export function startUpload() {
  Toast.info("🚀 GitHub 업로드를 시작합니다!", 3000);
  log.debug("startUpload: Upload start toast displayed");
}

/**
 * 업로드 실패 알림 (공통)
 * 모든 플랫폼에서 사용할 수 있는 통합 실패 알림 함수
 *
 * @param {Object} uploadState - 업로드 상태를 관리하는 객체 (선택적)
 */
export function markUploadFailedCSS(uploadState) {
  if (uploadState) {
    uploadState.uploading = false;
  }

  const toast = Toast.danger("", 5000);

  // React 컴포넌트를 사용하여 Toast 내용 렌더링
  if (toast && toast.element) {
    const messageContainer = toast.element.querySelector(".message-container");
    if (messageContainer) {
      messageContainer.innerHTML = "";
      const reactContainer = document.createElement("div");
      messageContainer.appendChild(reactContainer);

      const root = createRoot(reactContainer);
      root.render(React.createElement(ToastFailureMessage));
    }
  }

  log.debug("markUploadFailedCSS: Upload failure toast displayed");
}

/**
 * 업로드 타임아웃을 설정합니다.
 * Toast를 사용하므로 이 함수는 더 이상 필요하지 않지만 호환성을 위해 유지합니다.
 *
 * @param {Object} uploadState - 업로드 상태를 관리하는 객체
 * @param {number} timeout - 타임아웃 시간 (기본값: 10000ms)
 */
export function startUploadCountDown(uploadState) {
  // Toast를 사용하므로 별도의 타임아웃 처리가 필요 없음
  if (uploadState) {
    uploadState.uploading = true;
  }
}

/**
 * 공통 UI 유틸리티 함수 모음
 * 모든 플랫폼에서 공통으로 사용되는 UI 관련 함수들을 통합했습니다.
 */

/**
 * 백준의 날짜 형식과 같게 포맷된 스트링을 반환하는 함수
 * @example 2023년 9월 23일 16:26:26
 * @param {Date} date
 * @return {string} 포맷된 스트링
 */
export function getDateString(date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");

  return `${year}년 ${month}월 ${day}일 ${hours}:${minutes}:${seconds}`;
}

/**
 * 업로드 UI를 초기화하고 로딩 아이콘을 표시합니다.
 * 각 플랫폼별 타겟 요소를 인수로 받아 해당 요소에 로딩 아이콘을 추가합니다.
 *
 * @param {HTMLElement|null} targetElement - 로딩 아이콘을 추가할 대상 요소
 * @param {Object} uploadState - 업로드 상태를 관리하는 객체
 * @returns {HTMLElement|null} - 생성된 로딩 아이콘 요소
 */
export function initUploadUI(targetElement, uploadState) {
  if (!targetElement) return null;

  // Toast를 사용하므로 로딩 UI는 더 이상 필요하지 않지만
  // 다른 플랫폼과의 호환성을 위해 기본 구조는 유지
  startUploadCountDown(uploadState);
  return null;
}

/**
 * 업로드 완료 알림 (공통)
 * 모든 플랫폼에서 사용할 수 있는 통합 성공 알림 함수
 * React 컴포넌트를 사용하여 클릭 가능한 GitHub 링크를 제공
 *
 * @param {Object} branches - 브랜치 정보 ('userName/repositoryName': 'branchName')
 * @param {string} directory - 디렉토리 경로 ('백준/Gold/1000. A+B')
 * @param {Object} uploadState - 업로드 상태를 관리하는 객체 (선택적)
 */
export function markUploadedCSS(branches, directory, uploadState) {
  if (uploadState) {
    uploadState.uploading = false;
  }

  // branches 유효성 검사
  if (!branches || typeof branches !== "object" || Object.keys(branches).length === 0) {
    log.warn("markUploadedCSS: Invalid branches object:", branches);
    // branches가 없어도 기본 성공 알림은 표시
    Toast.success("✅ 업로드가 완료되었습니다!", 5000);
    return;
  }

  // GitHub 링크 생성
  const repoName = Object.keys(branches)[0];
  const branchName = branches[repoName];
  const uploadedUrl = `https://github.com/${repoName}/tree/${branchName}/${directory}`;

  // 성공 Toast에 클릭 가능한 링크 표시 (React 컴포넌트 사용)
  const directoryParts = (directory || "").split("/");
  const problemInfo = directoryParts[directoryParts.length - 1] || directory || "문제";
  const toast = Toast.success("", 8000);

  // Toast 클릭 시 GitHub 페이지로 이동
  if (toast && toast.element) {
    toast.element.style.cursor = "pointer";

    // React 컴포넌트를 사용하여 Toast 내용 렌더링
    const messageContainer = toast.element.querySelector(".message-container");
    if (messageContainer) {
      // 기존 내용을 지우고 React 컴포넌트로 교체
      messageContainer.innerHTML = "";
      const reactContainer = document.createElement("div");
      messageContainer.appendChild(reactContainer);

      const root = createRoot(reactContainer);
      root.render(
        React.createElement(ToastSuccessMessage, {
          problemInfo: problemInfo,
          onGitHubClick: () => window.open(uploadedUrl, "_blank"),
        })
      );
    }

    toast.element.addEventListener("click", () => {
      window.open(uploadedUrl, "_blank");
    });
  }

  log.debug("markUploadedCSS: Upload success toast displayed");
}

/**
 * 이미지 태그의 상대 URL을 절대 URL로 변환합니다.
 *
 * @param {Document} doc - 변환할 문서 객체
 */
export function convertImageTagToAbsoluteURL(doc = document) {
  if (!doc) return;

  // img 태그 찾아서 src 속성을 절대 경로로 변경
  Array.from(doc.getElementsByTagName("img"), (img) => {
    if (img.currentSrc) {
      img.setAttribute("src", img.currentSrc);
    }
    return img;
  });
}
