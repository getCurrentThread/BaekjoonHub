/**
 * Upload Service - Migrated to Centralized Storage
 * GitHub upload service using centralized state management
 */

import { GitHub } from "./github.js";
import { getToken, getHook, getStats, saveStats, updateObjectDatafromPath, initializeStorageAdapter } from "@/storage/storageAdapter.js";
import { isNull, isEmpty } from "./util.js";
import log from "@scripts/commons/logger.js";

/**
 * 모든 플랫폼에서 공통으로 사용할 수 있는 업로드 서비스 클래스
 * GitHub API를 사용하여 코드, README 등의 파일을 GitHub 저장소에 업로드합니다.
 *
 * Now uses centralized storage management for better performance and consistency
 */
export default class UploadService {
  /**
   * Initialize storage adapter (called once per service usage)
   */
  static async ensureStorageInitialized() {
    try {
      await initializeStorageAdapter();
    } catch (error) {
      log.error("UploadService: Failed to initialize storage adapter:", error);
      throw error;
    }
  }

  /**
   * 문제 데이터를 GitHub에 업로드합니다.
   *
   * @param {Object} problemData - 업로드할 문제 데이터
   * @param {string} problemData.code - 소스코드 내용
   * @param {string} problemData.readme - README.md 내용
   * @param {string} problemData.directory - 업로드할 디렉토리 경로
   * @param {string} problemData.fileName - 소스코드 파일명
   * @param {string} problemData.message - 커밋 메시지
   * @param {string} problemData.platform - 플랫폼 정보(백준, 프로그래머스, SWEA, goormlevel)
   * @param {Object} problemData.problemInfo - 문제 관련 메타 정보
   * @param {Function} callback - 업로드 완료 후 실행할 콜백 함수
   * @returns {Promise<void>}
   */
  static async uploadProblem(problemData, callback) {
    try {
      // Ensure storage is initialized
      await this.ensureStorageInitialized();

      const { code, readme, directory, fileName, message } = problemData;

      // Get authentication data from centralized storage
      const token = await getToken();
      const hook = await getHook();

      if (isNull(token) || isNull(hook)) {
        log.error("UploadService: Token or hook is null", { token: !!token, hook: !!hook });
        return Promise.resolve();
      }

      log.info("UploadService: Starting upload with centralized storage", {
        directory,
        fileName,
        platform: problemData.platform,
      });

      // 업로드 전 현재 업로드할 파일의 SHA 값과 비교하여 중복 업로드 방지 로직은 플랫폼별 업로드 함수에서 처리함
      return this.upload(token, hook, code, readme, directory, fileName, message, callback);
    } catch (error) {
      log.error("UploadService: Error uploading problem:", error);
      throw error; // 오류 위로 전파하여 호출자가 오류 처리할 수 있도록 함
    }
  }

  /**
   * GitHub API를 사용하여 파일을 업로드합니다.
   *
   * @param {string} token - GitHub API 토큰
   * @param {string} hook - GitHub 저장소 (username/repo 형식)
   * @param {string} code - 업로드할 소스코드
   * @param {string} readme - 업로드할 README 내용
   * @param {string} directory - 업로드할 디렉토리
   * @param {string} fileName - 파일명
   * @param {string} commitMessage - 커밋 메시지
   * @param {Function} callback - 완료 콜백
   * @returns {Promise<void>}
   */
  static async upload(token, hook, code, readme, directory, fileName, commitMessage, callback) {
    try {
      const git = new GitHub(hook, token);

      log.info("UploadService: Starting GitHub upload", {
        hook,
        directory,
        fileName,
        codeLength: code?.length,
        readmeLength: readme?.length,
      });

      // Upload source code file
      if (!isNull(code) && !isEmpty(code)) {
        const codeFilePath = `${directory}/${fileName}`;
        const codeResult = await git.updateFile(codeFilePath, commitMessage, code);

        if (codeResult && codeResult.sha) {
          log.info("UploadService: Code file uploaded successfully", {
            path: codeFilePath,
            sha: codeResult.sha,
          });

          // Update stats using centralized storage
          await this.updateSubmissionStats(`${hook}/${codeFilePath}`, codeResult.sha);
        }
      }

      // Upload README file
      if (!isNull(readme) && !isEmpty(readme)) {
        const readmeFilePath = `${directory}/README.md`;
        const readmeResult = await git.updateFile(readmeFilePath, commitMessage, readme);

        if (readmeResult && readmeResult.sha) {
          log.info("UploadService: README file uploaded successfully", {
            path: readmeFilePath,
            sha: readmeResult.sha,
          });

          // Update stats using centralized storage
          await this.updateSubmissionStats(`${hook}/${readmeFilePath}`, readmeResult.sha);
        }
      }

      // Execute callback if provided
      if (callback && typeof callback === "function") {
        try {
          callback();
        } catch (callbackError) {
          log.error("UploadService: Error executing callback:", callbackError);
        }
      }

      log.info("UploadService: Upload completed successfully");
    } catch (error) {
      log.error("UploadService: Upload failed:", error);
      throw error;
    }
  }

  /**
   * Update submission statistics using centralized storage
   * @param {string} path - File path
   * @param {string} sha - File SHA
   */
  static async updateSubmissionStats(path, sha) {
    try {
      const stats = await getStats();

      if (!stats.submission) {
        stats.submission = {};
      }

      // Update submission stats
      updateObjectDatafromPath(stats.submission, path, sha);

      // Save updated stats
      await saveStats(stats);

      log.debug("UploadService: Submission stats updated", {
        path,
        sha: sha.substring(0, 8) + "...",
      });
    } catch (error) {
      log.error("UploadService: Failed to update submission stats:", error);
      // Don't throw error here to avoid failing the upload
    }
  }

  /**
   * Check if file already exists with same content
   * @param {string} hook - Repository hook
   * @param {string} token - GitHub token
   * @param {string} filePath - File path
   * @param {string} content - File content
   * @returns {Promise<boolean>} - True if file exists with same content
   */
  static async isFileUpToDate(hook, token, filePath, content) {
    try {
      const git = new GitHub(hook, token);
      const existingFile = await git.getFile(filePath);

      if (!existingFile) {
        return false; // File doesn't exist
      }

      // Compare content
      const existingContent = Buffer.from(existingFile.content, "base64").toString("utf-8");
      return existingContent.trim() === content.trim();
    } catch (error) {
      log.debug("UploadService: Error checking file status:", error.message);
      return false; // Assume file needs update on error
    }
  }

  /**
   * Get upload statistics from centralized storage
   * @returns {Promise<Object>} Upload statistics
   */
  static async getUploadStats() {
    try {
      await this.ensureStorageInitialized();
      const stats = await getStats();

      return {
        totalSubmissions: this.countSubmissions(stats.submission),
        totalBranches: Object.keys(stats.branches || {}).length,
        lastUpdate: stats.lastUpdate || null,
        version: stats.version || "0.0.0",
      };
    } catch (error) {
      log.error("UploadService: Error getting upload stats:", error);
      return {
        totalSubmissions: 0,
        totalBranches: 0,
        lastUpdate: null,
        version: "0.0.0",
      };
    }
  }

  /**
   * Count total submissions recursively
   * @param {Object} submissions - Submissions object
   * @returns {number} Total count
   */
  static countSubmissions(submissions) {
    if (!submissions || typeof submissions !== "object") {
      return 0;
    }

    let count = 0;
    for (const key in submissions) {
      if (typeof submissions[key] === "string") {
        // This is a SHA value (leaf node)
        count++;
      } else if (typeof submissions[key] === "object") {
        // Recursive count
        count += this.countSubmissions(submissions[key]);
      }
    }
    return count;
  }

  /**
   * Clear upload cache/stats
   * @returns {Promise<void>}
   */
  static async clearUploadStats() {
    try {
      await this.ensureStorageInitialized();

      const clearedStats = {
        version: "0.0.0",
        branches: {},
        submission: {},
        problems: {},
      };

      await saveStats(clearedStats);
      log.info("UploadService: Upload stats cleared");
    } catch (error) {
      log.error("UploadService: Error clearing upload stats:", error);
      throw error;
    }
  }
}
