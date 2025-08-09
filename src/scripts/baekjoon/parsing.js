/**
 * Baekjoon Parsing - Migrated to Centralized Storage
 * Handles Baekjoon problem parsing with centralized state management
 */

import { isNull, unescapeHtml, convertSingleCharToDoubleChar, parseNumberFromString, isEmpty, filter } from "@scripts/commons/util.js";
import log from "@scripts/commons/logger.js";
import { getDateString } from "@scripts/commons/ui-util.js";
import { updateProblemData, getProblemData, updateSubmitCodeData, getSubmitCodeData } from "@scripts/baekjoon/storage.js";
import { RESULT_CATEGORY, languages, bjLevel } from "@scripts/baekjoon/variables.js";
import { convertResultTableHeader, findUsername, isExistResultTable } from "@scripts/baekjoon/util.js";
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
 * Find problem info and submission code
 */
export async function findProblemInfoAndSubmissionCode(problemId, submissionId) {
  log.debug("findProblemInfoAndSubmissionCode - problemId:", problemId, "submissionId:", submissionId);

  if (isNull(problemId) || isNull(submissionId)) {
    log.error("findProblemInfoAndSubmissionCode - problemId or submissionId is null");
    return null;
  }

  try {
    const [description, code, solvedJson] = await Promise.all([getProblemDescriptionById(problemId), getSubmitCodeById(submissionId), getSolvedACById(problemId)]);

    log.debug("findProblemInfoAndSubmissionCode - fetched data:", {
      description: description ? "exists" : "null",
      code: code ? "exists" : "null",
      solvedJson: solvedJson ? "exists" : "null",
    });

    if (!description || !code || !solvedJson) {
      log.error("findProblemInfoAndSubmissionCode - missing data");
      return null;
    }

    const problemTags =
      solvedJson.tags
        ?.flatMap((tag) => tag.displayNames)
        ?.filter((tag) => tag.language === "ko")
        ?.map((tag) => tag.name) || [];

    const title = solvedJson.titleKo;
    const level = bjLevel[solvedJson.level];

    const problemDescription = description?.problemDescription;
    const problemInput = description?.problemInput;
    const problemOutput = description?.problemOutput;

    return {
      problemId,
      submissionId,
      title,
      level,
      code,
      problemDescription,
      problemInput,
      problemOutput,
      problemTags,
    };
  } catch (err) {
    log.error("findProblemInfoAndSubmissionCode - error occurred:", err);
    return null;
  }
}

/**
 * Make detail message and readme content
 */
export async function makeDetailMessageAndReadme(data) {
  log.debug("makeDetailMessageAndReadme - input data:", data);

  if (isNull(data)) {
    log.error("makeDetailMessageAndReadme - data is null");
    return null;
  }

  // 구 버전과 새 버전의 변수명 모두 지원
  const problemId = data.problemId;
  const result = data.result;
  const title = data.title;
  const level = data.level;
  const problemTags = data.problemTags || data.problem_tags || [];
  const submissionTime = data.submissionTime;
  const code = data.code;
  const language = data.language;
  const memory = data.memory;
  const runtime = data.runtime;

  // 필수 데이터 검증
  if (isNull(problemId) || isNull(title) || isNull(code) || isNull(language)) {
    log.error("makeDetailMessageAndReadme - Missing required data:", {
      problemId: problemId,
      title: title,
      code: code ? "exists" : "null",
      language: language,
    });
    return null;
  }

  const score = parseNumberFromString(result || "");

  // 언어 정보 처리
  const processedLanguage = langVersionRemove(language, null);

  // 기본 디렉토리 경로 생성
  const baseDirPath = `백준/${level.replace(/ .*/, "")}/${problemId}. ${convertSingleCharToDoubleChar(title)}`;

  // 템플릿을 사용한 디렉토리 경로 생성
  let directory = baseDirPath; // 기본값으로 설정

  // 수정된 커밋 메시지 (Title 부분 수정)
  const message = `[${level}] Title: ${title}, Time: ${runtime} ms, Memory: ${memory} KB${Number.isNaN(score) ? "" : `, Score: ${score} point`} -BaekjoonHub`;

  const category = problemTags.join(", ");
  const fileName = `${convertSingleCharToDoubleChar(title)}.${languages[processedLanguage] || "txt"}`;
  const dateInfo = submissionTime ?? getDateString(new Date(Date.now()));

  // prettier-ignore-start
  const readme =
    `# [${level}] ${title} - ${problemId} \n\n` +
    `[문제 링크](${urls.BAEKJOON_PROBLEM_URL}${problemId}) \n\n` +
    `### 성능 요약\n\n` +
    `메모리: ${memory} KB, ` +
    `시간: ${runtime} ms\n\n` +
    `### 분류\n\n` +
    `${category || "Empty"}\n\n${dateInfo ? `### 제출 일자\n\n${dateInfo}` : ""}`;
  // prettier-ignore-end

  return {
    directory,
    fileName,
    message,
    readme,
    code,
  };
}

/**
 * Find data from submission result with complete upload data
 */
export async function findData(inputData) {
  try {
    let data = inputData;
    log.debug("findData - inputData:", data);

    // 데이터가 없는 경우 결과 테이블에서 가져오기 (구 버전 호환성)
    if (isNull(data)) {
      log.debug("findData - No input data, searching from result table");

      if (!isExistResultTable()) {
        log.error("findData - Result table not found");
        return null;
      }

      let table = parsingResultTableList();
      if (isEmpty(table)) {
        log.error("findData - Empty result table");
        return null;
      }

      // 맞은 문제만 필터링
      table = filter(table, {
        resultCategory: RESULT_CATEGORY.RESULT_ACCEPTED,
        username: findUsername(),
        language: table[0]["language"],
      });

      if (isEmpty(table)) {
        log.error("findData - No accepted submissions found");
        return null;
      }

      data = selectBestSubmissionList(table)[0];
    }

    // 필수 데이터 검증
    if (isNull(data.problemId) || isNull(data.submissionId)) {
      log.error("findData - Missing required data:", {
        problemId: data.problemId,
        submissionId: data.submissionId,
      });
      return null;
    }

    // 대회 문제 검증
    if (Number.isNaN(Number(data.problemId)) || Number(data.problemId) < 1000) {
      throw new Error(`정책상 대회 문제는 업로드 되지 않습니다. 대회 문제가 아니라고 판단된다면 이슈로 남겨주시길 바랍니다.\n문제 ID: ${data.problemId}`);
    }

    // 문제 정보와 코드 가져오기
    const problemInfoAndCode = await findProblemInfoAndSubmissionCode(data.problemId, data.submissionId);
    log.debug("findData - problemInfoAndCode:", problemInfoAndCode);

    if (isNull(problemInfoAndCode)) {
      log.error("findData - Failed to fetch problem info and code");
      return null;
    }

    // 데이터 합치기
    const mergedData = preProcessEmptyObj({ ...data, ...problemInfoAndCode });
    log.debug("findData - mergedData:", mergedData);

    // 상세 정보 생성
    const detail = await makeDetailMessageAndReadme(mergedData);
    if (isNull(detail)) {
      log.error("findData - Failed to create detail message and readme");
      return null;
    }

    // 최종 데이터 반환
    return { ...data, ...problemInfoAndCode, ...detail };
  } catch (error) {
    log.error("findData - Error:", error);
    return null;
  }
}

/**
 * Parse problem description from current page or document
 */
export function parseProblemDescription(doc = document) {
  try {
    let problemId = null;
    
    log.debug("parseProblemDescription - attempting to parse from doc");
    
    // First try to extract from URL (for problem pages)
    const problemIdMatch = window.location.href.match(/\/problem\/(\d+)/);
    if (problemIdMatch) {
      problemId = problemIdMatch[1];
      log.debug("parseProblemDescription - extracted from URL:", problemId);
    } else {
      // Try to extract from title element (fallback method)
      const titleElement = doc.querySelector("title");
      if (titleElement) {
        const titleText = titleElement.textContent;
        log.debug("parseProblemDescription - title text:", titleText);
        
        // Try multiple patterns to extract problem ID from title
        let titleMatch = titleText.match(/(\d+):/);
        if (!titleMatch) {
          titleMatch = titleText.match(/문제.*?(\d+)/);
        }
        if (!titleMatch) {
          titleMatch = titleText.match(/(\d+)/); // Any number as last resort
        }
        
        if (titleMatch) {
          problemId = titleMatch[1];
          log.debug("parseProblemDescription - extracted from title:", problemId);
        }
      }
    }
    
    // If we still don't have problemId, this function might be called from fetchProblemDescriptionById
    // In that case, the caller will set the problemId manually
    
    const titleElement = doc.querySelector("#problem_title");
    const title = titleElement ? titleElement.textContent.trim() : (problemId ? `Problem ${problemId}` : "Unknown Problem");
    
    // Extract problem content
    const descriptionElement = doc.querySelector("#problem_description");
    const inputElement = doc.querySelector("#problem_input");
    const outputElement = doc.querySelector("#problem_output");
    
    const problemDescription = descriptionElement ? descriptionElement.innerHTML.trim() : "";
    const problemInput = inputElement ? inputElement.innerHTML.trim() : "Empty";
    const problemOutput = outputElement ? outputElement.innerHTML.trim() : "Empty";

    log.debug(`parseProblemDescription - parsed data:`, { 
      problemId, 
      title, 
      hasDescription: !!problemDescription,
      hasInput: problemInput !== "Empty",
      hasOutput: problemOutput !== "Empty"
    });

    // Return data even if problemId is null - caller can set it
    return { 
      problemId, 
      title, 
      problemDescription, 
      problemInput, 
      problemOutput 
    };
  } catch (error) {
    log.error("Error parsing problem description:", error);
    return null;
  }
}

/**
 * 누락된 유틸리티 함수들
 */

// preProcessEmptyObj 함수
function preProcessEmptyObj(obj) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null && value !== "") {
      result[key] = value;
    }
  }
  return result;
}

// langVersionRemove 함수
function langVersionRemove(lang, ignores = null) {
  if (!lang) return lang;

  const ignoreSet = new Set(ignores || []);
  if (ignoreSet.has(lang)) return lang;

  // Remove version numbers and extra info
  return lang.split(" ")[0].split("(")[0];
}

// selectBestSubmissionList 함수
function selectBestSubmissionList(table) {
  if (!table || table.length === 0) return [];

  // Group by problem ID and select best submission
  const grouped = {};
  table.forEach((item) => {
    const key = item.problemId;
    if (!grouped[key] || item.submissionTime > grouped[key].submissionTime) {
      grouped[key] = item;
    }
  });

  return Object.values(grouped);
}

// getProblemDescriptionById, getSubmitCodeById, getSolvedACById 함수들
export async function getProblemDescriptionById(problemId) {
  let problem = await getProblemData(problemId);

  if (isNull(problem)) {
    problem = await fetchProblemDescriptionById(problemId);
    if (problem) {
      await updateProblemData(problemId, problem);
    }
  }
  return problem;
}

export async function getSubmitCodeById(submissionId) {
  let code = await getSubmitCodeData(submissionId);

  if (isNull(code)) {
    code = await fetchSubmitCodeById(submissionId);
    if (code) {
      updateSubmitCodeData(submissionId, code);
    }
  }
  return code;
}

export async function getSolvedACById(problemId) {
  try {
    // Use background script to avoid CORS issues
    log.debug(`Fetching solved.ac data for problemId: ${problemId}`);
    const jsonData = await chrome.runtime.sendMessage({
      sender: "baekjoon",
      task: "SolvedApiCall",
      problemId,
    });
    
    if (jsonData && jsonData.problemId) {
      return jsonData;
    }
  } catch (error) {
    log.error("getSolvedACById error:", error);
  }

  // 기본값 반환
  return {
    problemId,
    titleKo: `문제 ${problemId}`,
    level: 0,
    tags: [],
  };
}

export async function fetchProblemDescriptionById(problemId) {
  try {
    const url = `${urls.BAEKJOON_PROBLEM_URL}${problemId}`;
    log.debug("fetchProblemDescriptionById - fetching URL:", url);
    
    const response = await fetch(url);
    const html = await response.text();

    const doc = new DOMParser().parseFromString(html, "text/html");
    
    // Debug: Check if the page has expected elements
    const titleElement = doc.querySelector("#problem_title");
    const descriptionElement = doc.querySelector("#problem_description");
    log.debug("fetchProblemDescriptionById - page elements check:", {
      titleExists: !!titleElement,
      descriptionExists: !!descriptionElement,
      titleText: titleElement?.textContent?.trim(),
      pageTitle: doc.querySelector("title")?.textContent?.trim()
    });
    
    const problemData = parseProblemDescription(doc);
    
    if (problemData) {
      // Ensure problemId is set correctly
      problemData.problemId = problemId;
    } else {
      // If parsing failed, create minimal problem data
      log.warn("fetchProblemDescriptionById - parsing failed, creating minimal data");
      const title = titleElement ? titleElement.textContent.trim() : `Problem ${problemId}`;
      const description = descriptionElement ? descriptionElement.innerHTML.trim() : "";
      const inputElement = doc.querySelector("#problem_input");
      const outputElement = doc.querySelector("#problem_output");
      
      return {
        problemId,
        title,
        problemDescription: description,
        problemInput: inputElement ? inputElement.innerHTML.trim() : "Empty",
        problemOutput: outputElement ? outputElement.innerHTML.trim() : "Empty"
      };
    }
    
    return problemData;
  } catch (error) {
    log.error("fetchProblemDescriptionById error:", error);
    return null;
  }
}

export async function fetchSubmitCodeById(submissionId) {
  try {
    const response = await fetch(`${urls.BAEKJOON_SOURCE_DOWNLOAD_URL}${submissionId}`);
    return await response.text();
  } catch (error) {
    log.error("fetchSubmitCodeById error:", error);
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
