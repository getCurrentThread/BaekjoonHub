/**
 * Baekjoon Parsing - Migrated to Centralized Storage
 * Handles Baekjoon problem parsing with centralized state management
 */

import { isNull, unescapeHtml } from "@scripts/commons/util.js";
import log from "@scripts/commons/logger.js";
import { getDateString } from "@scripts/commons/ui-util.js";
import { updateProblemData, getProblemData, updateSubmitCodeData, getSubmitCodeData } from "@scripts/baekjoon/storage.js";
import { RESULT_CATEGORY } from "@scripts/baekjoon/variables.js";
import { convertResultTableHeader } from "@scripts/baekjoon/util.js";
import { getDirNameByTemplate } from "@/storage/storageAdapter.js"; // Use centralized storage
import PlatformHubBase from "@scripts/commons/platformhub-base.js";
import urls from "@scripts/constants/url.js";

/**
 * Baekjoon Platform Handler
 * Extends base platform with Baekjoon-specific functionality
 */
class BaekjoonPlatform extends PlatformHubBase {
  constructor() {
    super("baekjoon");
  }

  /**
   * Initialize Baekjoon platform
   */
  async initialize() {
    await super.initialize();

    // Baekjoon-specific initialization
    this.setupPageObserver();
    log.info("BaekjoonPlatform: Initialized successfully");
  }

  /**
   * Set up page observer for result table changes
   */
  setupPageObserver() {
    // Observe for result table changes on status pages
    if (window.location.href.includes("/status")) {
      this.observeResultTable();
    }

    // Observe for problem page changes
    if (window.location.href.includes("/problem/")) {
      this.observeProblemPage();
    }
  }

  /**
   * Observe result table for new submissions
   */
  observeResultTable() {
    const observer = new MutationObserver(async (mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          await this.handleResultTableUpdate();
        }
      }
    });

    const resultTable = document.getElementById("status-table");
    if (resultTable) {
      observer.observe(resultTable, { childList: true, subtree: true });
    }
  }

  /**
   * Observe problem page for problem data
   */
  observeProblemPage() {
    // Extract problem information when on problem page
    this.extractProblemInfo().catch((error) => {
      log.error("BaekjoonPlatform: Error extracting problem info:", error);
    });
  }

  /**
   * Handle result table updates
   */
  async handleResultTableUpdate() {
    try {
      // Check if extension is enabled
      if (!(await this.shouldBeActive())) {
        return;
      }

      const resultList = parsingResultTableList();
      if (!resultList || resultList.length === 0) {
        return;
      }

      // Process new accepted submissions
      const acceptedSubmissions = resultList.filter((item) => item.resultCategory === RESULT_CATEGORY.ACCEPTED);

      for (const submission of acceptedSubmissions) {
        await this.processAcceptedSubmission(submission);
      }
    } catch (error) {
      log.error("BaekjoonPlatform: Error handling result table update:", error);
    }
  }

  /**
   * Process accepted submission for upload
   */
  async processAcceptedSubmission(submission) {
    try {
      const { problemId, language, submissionId } = submission;

      // Check if already uploaded
      const filePath = await this.getSubmissionFilePath(problemId, language);
      if (await this.isProblemUploaded(filePath)) {
        log.debug("BaekjoonPlatform: Submission already uploaded", { problemId, submissionId });
        return;
      }

      // Get submission code
      const code = await this.getSubmissionCode(submissionId);
      if (!code) {
        log.warn("BaekjoonPlatform: Could not get submission code", { submissionId });
        return;
      }

      // Get problem information
      const problemInfo = await this.getProblemInfo(problemId);
      if (!problemInfo) {
        log.warn("BaekjoonPlatform: Could not get problem info", { problemId });
        return;
      }

      // Generate directory path
      const directory = await getDirNameByTemplate(`백준/${problemId}. ${problemInfo.title}`, language, problemInfo);

      // Create problem data
      const problemData = {
        code,
        readme: this.generateReadme(problemInfo, submission),
        directory,
        fileName: this.getFileName(problemInfo.title, language),
        message: `[백준] ${problemId}. ${problemInfo.title} (${language})`,
        platform: "baekjoon",
        problemInfo: {
          ...problemInfo,
          submissionId,
          language,
        },
      };

      // Upload problem
      await this.uploadProblem(problemData, () => {
        this.showNotification(`문제 ${problemId} 업로드 완료!`, "success");
      });
    } catch (error) {
      log.error("BaekjoonPlatform: Error processing accepted submission:", error);
      this.showNotification(`업로드 실패: ${error.message}`, "error");
    }
  }

  /**
   * Get submission code by ID
   */
  async getSubmissionCode(submissionId) {
    try {
      // Check cached code first
      const cachedCode = await getSubmitCodeData(submissionId);
      if (cachedCode) {
        return cachedCode;
      }

      // Fetch from Baekjoon
      const codeUrl = `${urls.BAEKJOON_BASE_URL}/source/${submissionId}`;
      const doc = await findHtmlDocumentByUrl(codeUrl);

      const codeElement = doc.getElementById("source");
      if (!codeElement) {
        throw new Error("Could not find source code element");
      }

      const code = codeElement.textContent.trim();

      // Cache for future use
      await updateSubmitCodeData(submissionId, code);

      return code;
    } catch (error) {
      log.error("BaekjoonPlatform: Error getting submission code:", error);
      return null;
    }
  }

  /**
   * Get problem information
   */
  async getProblemInfo(problemId) {
    try {
      // Check cached problem data first
      const cachedProblem = await getProblemData(problemId);
      if (cachedProblem) {
        return cachedProblem;
      }

      // Fetch from Baekjoon
      const problemUrl = `${urls.BAEKJOON_BASE_URL}/problem/${problemId}`;
      const doc = await findHtmlDocumentByUrl(problemUrl);

      const problemInfo = this.extractProblemFromDocument(doc, problemId);

      // Cache for future use
      await updateProblemData(problemId, problemInfo);

      return problemInfo;
    } catch (error) {
      log.error("BaekjoonPlatform: Error getting problem info:", error);
      return null;
    }
  }

  /**
   * Extract problem information from document
   */
  extractProblemFromDocument(doc, problemId) {
    const titleElement = doc.querySelector("#problem_title");
    const title = titleElement ? titleElement.textContent.trim() : `Problem ${problemId}`;

    const descriptionElement = doc.querySelector("#problem_description");
    const description = descriptionElement ? descriptionElement.innerHTML : "";

    const inputElement = doc.querySelector("#problem_input");
    const input = inputElement ? inputElement.innerHTML : "";

    const outputElement = doc.querySelector("#problem_output");
    const output = outputElement ? outputElement.innerHTML : "";

    // Get time and memory limits
    const infoTable = doc.querySelector(".table-responsive table");
    let timeLimit = "",
      memoryLimit = "";

    if (infoTable) {
      const rows = infoTable.querySelectorAll("tr");
      if (rows.length > 0) {
        const cells = rows[0].querySelectorAll("td");
        if (cells.length >= 2) {
          timeLimit = cells[0].textContent.trim();
          memoryLimit = cells[1].textContent.trim();
        }
      }
    }

    return {
      problemId,
      title,
      description,
      input,
      output,
      timeLimit,
      memoryLimit,
      platform: "baekjoon",
      url: `${urls.BAEKJOON_BASE_URL}/problem/${problemId}`,
      extractedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate README content for problem
   */
  generateReadme(problemInfo, submission) {
    const { title, description, input, output, timeLimit, memoryLimit, url } = problemInfo;
    const { language, submissionTime } = submission;

    return `# [${problemInfo.problemId}] ${title}

## 문제 정보
- **시간 제한**: ${timeLimit}
- **메모리 제한**: ${memoryLimit}
- **언어**: ${language}
- **제출 시간**: ${submissionTime}
- **문제 링크**: [${title}](${url})

## 문제 설명
${this.htmlToMarkdown(description)}

## 입력
${this.htmlToMarkdown(input)}

## 출력
${this.htmlToMarkdown(output)}

---
**풀이 날짜**: ${getDateString()}  
**플랫폼**: 백준 온라인 저지  
**자동 업로드**: BaekjoonHub
`;
  }

  /**
   * Convert HTML to Markdown (simplified)
   */
  htmlToMarkdown(html) {
    return html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<p>/gi, "")
      .replace(/<[^>]*>/g, "")
      .trim();
  }

  /**
   * Get file name for submission
   */
  getFileName(title, language) {
    const safeTitle = this.sanitizeFileName(title);
    const extension = this.getFileExtension(language);
    return `${safeTitle}.${extension}`;
  }

  /**
   * Get file extension for language
   */
  getFileExtension(language) {
    const extensionMap = {
      "C++": "cpp",
      C: "c",
      Java: "java",
      Python: "py",
      Python3: "py",
      JavaScript: "js",
      TypeScript: "ts",
      Go: "go",
      Rust: "rs",
      Kotlin: "kt",
      Swift: "swift",
    };

    return extensionMap[language] || "txt";
  }

  /**
   * Get submission file path for checking uploads
   */
  async getSubmissionFilePath(problemId, language) {
    const problemInfo = await this.getProblemInfo(problemId);
    const title = problemInfo ? problemInfo.title : `Problem ${problemId}`;
    const directory = await getDirNameByTemplate(`백준/${problemId}. ${title}`, language, problemInfo);
    const fileName = this.getFileName(title, language);
    return `${directory}/${fileName}`;
  }
}

// Original parsing functions with centralized storage integration

/**
 * url에 해당하는 html 문서를 가져오는 함수
 * @param url: url 주소
 * @returns html document
 */
export async function findHtmlDocumentByUrl(url) {
  return fetch(url, { method: "GET" })
    .then((html) => html.text())
    .then((text) => {
      const parser = new DOMParser();
      return parser.parseFromString(text, "text/html");
    });
}

export function parsingResultTableList(doc = document) {
  const table = doc.getElementById("status-table");
  if (table === null || table === undefined || table.length === 0) return [];
  const headers = Array.from(table.rows[0].cells, (x) => convertResultTableHeader(x.innerText.trim()));

  const list = [];
  for (let i = 1; i < table.rows.length; i++) {
    const row = table.rows[i];
    const cells = Array.from(row.cells, (x, index) => {
      switch (headers[index]) {
        case "result":
          return { result: x.innerText.trim(), resultCategory: x.firstChild.getAttribute("data-color").replace("-eng", "").trim() };
        case "language":
          return unescapeHtml(x.innerText).replace(/\/.*$/g, "").trim();
        case "submissionTime": {
          const el = x.querySelector("a.real-time-update.show-date") || x.querySelector("a.show-date");
          if (isNull(el)) return null;
          return el.getAttribute("data-original-title");
        }
        case "problemId": {
          const a = x.querySelector("a.problem_title");
          if (isNull(a)) return null;
          return {
            problemId: a.getAttribute("href").replace(/^.*\/([0-9]+)$/, "$1"),
          };
        }
        default:
          return x.innerText.trim();
      }
    });

    const obj = {};
    headers.forEach((header, index) => {
      if (header === "result") {
        obj.result = cells[index].result;
        obj.resultCategory = cells[index].resultCategory;
      } else if (header === "problemId") {
        obj.problemId = cells[index].problemId;
      } else {
        obj[header] = cells[index];
      }
    });

    list.push(obj);
  }

  return list;
}

/**
 * Find data from submission result (legacy compatibility)
 */
export function findData(submissionData) {
  try {
    if (!submissionData) {
      log.warn("No submission data provided to findData");
      return null;
    }

    const { problemId, language, submissionId } = submissionData;

    return {
      bojData: {
        problemId: problemId,
        language: language,
        submissionId: submissionId,
        timestamp: Date.now(),
      },
    };
  } catch (error) {
    log.error("Error in findData:", error);
    return null;
  }
}

/**
 * Parse problem description from current page
 */
export function parseProblemDescription() {
  try {
    const problemIdMatch = window.location.href.match(/\/problem\/(\d+)/);
    if (!problemIdMatch) {
      log.warn("Could not extract problem ID from URL");
      return null;
    }

    const problemId = problemIdMatch[1];
    const titleElement = document.querySelector("#problem_title");
    const title = titleElement ? titleElement.textContent.trim() : `Problem ${problemId}`;

    log.info(`Parsed problem: ${problemId}. ${title}`);
    return { problemId, title };
  } catch (error) {
    log.error("Error parsing problem description:", error);
    return null;
  }
}

// Initialize platform when script loads
const baekjoonPlatform = new BaekjoonPlatform();

// Auto-initialize when page loads
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    baekjoonPlatform.initialize().catch((error) => {
      log.error("BaekjoonPlatform: Failed to initialize:", error);
    });
  });
} else {
  baekjoonPlatform.initialize().catch((error) => {
    log.error("BaekjoonPlatform: Failed to initialize:", error);
  });
}

// Export platform instance and functions
export { baekjoonPlatform };
export default baekjoonPlatform;
