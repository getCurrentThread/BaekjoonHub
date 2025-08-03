import log from "@/commons/logger.js";
import { getObjectFromLocalStorage } from "@/commons/storage.js";
import { STORAGE_KEYS } from "@/constants/registry.js";
import urls from "@/constants/url.js";

/**
 * SSAFY Today API 서비스
 * 문제 풀이 데이터를 SSAFY Today로 전송합니다.
 */
export default class SSAFYTodayAPI {
  /**
   * SSAFY Today API로 제출 데이터를 전송합니다.
   * @param {Object} submissionData - 전송할 데이터
   * @returns {Promise<Object>} API 응답
   */
  static async sendSubmission(submissionData) {
    try {
      // GitHub 사용자명 가져오기
      const username = await getObjectFromLocalStorage(STORAGE_KEYS.USERNAME);
      const hook = await getObjectFromLocalStorage(STORAGE_KEYS.HOOK);
      
      // 표준화된 데이터 구조 생성
      const standardizedData = {
        username: username || "unknown",
        platform: submissionData.platform,
        problemData: {
          problemId: submissionData.problemInfo?.problemId || submissionData.problemId,
          title: submissionData.problemInfo?.title || submissionData.title,
          level: submissionData.problemInfo?.level || submissionData.level,
          language: submissionData.problemInfo?.language || submissionData.language,
          code: submissionData.code,
          runtime: submissionData.problemInfo?.runtime || submissionData.runtime,
          memory: submissionData.problemInfo?.memory || submissionData.memory,
          submissionTime: submissionData.problemInfo?.submissionTime || submissionData.submissionTime || new Date().toISOString(),
          tags: submissionData.problemInfo?.problem_tags || submissionData.problem_tags || [],
          // 플랫폼별 추가 데이터
          ...(submissionData.platform === "백준" && {
            problemDescription: submissionData.problemInfo?.problem_description,
            problemInput: submissionData.problemInfo?.problem_input,
            problemOutput: submissionData.problemInfo?.problem_output,
          }),
          ...(submissionData.platform === "프로그래머스" && {
            division: submissionData.problemInfo?.division,
            resultMessage: submissionData.problemInfo?.result_message,
          }),
          ...(submissionData.platform === "SWEA" && {
            length: submissionData.problemInfo?.length,
            link: submissionData.problemInfo?.link,
          }),
          ...(submissionData.platform === "goormlevel" && {
            examSequence: submissionData.problemInfo?.examSequence,
            link: submissionData.problemInfo?.link,
          }),
        },
        metadata: {
          extensionVersion: chrome.runtime.getManifest().version,
          timestamp: new Date().toISOString(),
          githubRepo: hook || "unknown",
          directory: submissionData.directory,
          fileName: submissionData.fileName,
          commitMessage: submissionData.message,
        }
      };

      log.info("SSAFY Today API - Sending submission data:", {
        platform: standardizedData.platform,
        problemId: standardizedData.problemData.problemId,
        username: standardizedData.username
      });

      // API 호출
      const response = await fetch(urls.SSAFY_TODAY_SUBMISSION_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 필요한 경우 추가 헤더
          // 'X-Extension-Version': chrome.runtime.getManifest().version,
        },
        body: JSON.stringify(standardizedData)
      });

      // 응답 처리
      if (!response.ok) {
        // 4xx, 5xx 에러 처리
        const errorText = await response.text();
        log.error(`SSAFY Today API error - Status: ${response.status}, Response: ${errorText}`);
        
        // API 오류가 있어도 GitHub 업로드는 계속 진행하도록 에러를 throw하지 않음
        return {
          success: false,
          status: response.status,
          error: errorText
        };
      }

      const responseData = await response.json();
      log.info("SSAFY Today API - Successfully sent submission data:", responseData);

      return {
        success: true,
        data: responseData
      };

    } catch (error) {
      // 네트워크 오류 등의 예외 처리
      log.error("SSAFY Today API - Network or parsing error:", error);
      
      // API 오류가 있어도 GitHub 업로드는 계속 진행하도록 에러를 throw하지 않음
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * API 연결 상태를 확인합니다.
   * @returns {Promise<boolean>} 연결 가능 여부
   */
  static async checkConnection() {
    try {
      const response = await fetch(urls.SSAFY_TODAY_API_BASE + '/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      return response.ok;
    } catch (error) {
      log.error("SSAFY Today API - Connection check failed:", error);
      return false;
    }
  }
}
