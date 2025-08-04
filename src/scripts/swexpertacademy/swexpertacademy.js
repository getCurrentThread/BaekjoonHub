import PlatformHubBase from "@/commons/platformhub-base.js";
import { SubmissionChecker } from "@/commons/loader-service.js";
import { Toast } from "@/commons/toast.js";
import { checkEnable } from "@/commons/enable.js";
import { getObjectFromLocalStorage, STORAGE_KEYS } from "@/commons/storage.js";

import { parseCode, parseData } from "@/swexpertacademy/parsing.js";
import uploadOneSolveProblemOnGit from "@/swexpertacademy/uploadfunctions.js";
import { startUpload, markUploadedCSS, getNickname, makeSubmitButton } from "@/swexpertacademy/util.js";
import log from "@/commons/logger.js";

class SWExpertAcademyHub extends PlatformHubBase {
  constructor() {
    super({
      platformName: "SW Expert Academy",
      loaderInterval: 2000,
    });
  }

  async init() {
    super.init();

    // Check if extension is enabled
    const enabled = await checkEnable();
    if (!enabled) {
      Toast.info("SW Expert Academy Hub가 비활성화되어 있습니다.");
      return;
    }

    if (this.isSWEASolvingPage()) {
      this.startSubmissionMonitoring();
    } else if (this.isSWEAProblemSolverPage()) {
      this.parseAndUpload();
    }
  }

  /**
   * Check if current page is SWEA solving page
   * @returns {boolean}
   */
  isSWEASolvingPage() {
    const headerSpan = this.querySelector("header > h1 > span");
    return this.matchesUrl(["/main/solvingProblem/solvingProblem.do"]) && headerSpan?.textContent === "모의 테스트";
  }

  /**
   * Check if current page is SWEA problem solver page
   * @returns {boolean}
   */
  isSWEAProblemSolverPage() {
    return this.matchesUrl(["/main/code/problem/problemSolver.do"]) && this.currentUrl.includes("extension=BaekjoonHub");
  }

  /**
   * Parse and upload data directly (for problem solver page)
   */
  async parseAndUpload() {
    try {
      const bojData = await this.createAndExecuteUploadHandler(parseData, uploadOneSolveProblemOnGit, markUploadedCSS, startUpload);
      await this.beginUpload(bojData, uploadOneSolveProblemOnGit, markUploadedCSS);
    } catch (error) {
      log.error("Error in SWEA parseAndUpload:", error);
    }
  }

  /**
   * Start monitoring for successful submissions
   */
  async startSubmissionMonitoring() {
    Toast.info("SW Expert Academy 문제 모니터링을 시작합니다.");
    
    // Get upload failed submissions setting
    const uploadFailedSubmissions = await getObjectFromLocalStorage(STORAGE_KEYS.UPLOAD_FAILED_SUBMISSIONS);
    
    let checker;
    if (uploadFailedSubmissions) {
      // Check for any popup result (both success and failure)
      checker = SubmissionChecker.createCustomChecker(() => {
        const popupText = document.querySelector("div.popup_layer.show > div > p.txt");
        if (!popupText) return false;
        const text = popupText.textContent?.toLowerCase() || "";
        // Accept both pass and fail messages
        return text.includes("pass") || text.includes("fail") || text.includes("실패");
      });
    } else {
      // Only check for success
      checker = SubmissionChecker.createTextChecker("div.popup_layer.show > div > p.txt", "pass입니다", { caseSensitive: false });
    }

    const onSuccess = async () => {
      log.info("결과가 나왔습니다. 코드를 파싱합니다");

      try {
        const { contestProbId } = await parseCode();
        const redirectUrl = this.buildRedirectUrl(contestProbId);
        await makeSubmitButton(redirectUrl);
      } catch (error) {
        log.error("Error processing SWEA result:", error);
      }
    };

    this.setupSubmissionMonitoring(checker, onSuccess);
  }

  /**
   * Build redirect URL for SWEA submission
   * @param {string} contestProbId - Contest problem ID
   * @returns {string} - Redirect URL
   */
  buildRedirectUrl(contestProbId) {
    const baseUrl = `${window.location.origin}/main/code/problem/problemSolver.do`;
    const params = new URLSearchParams({
      contestProbId,
      nickName: getNickname(),
      extension: "BaekjoonHub",
    });
    return `${baseUrl}?${params.toString()}`;
  }
}

new SWExpertAcademyHub();
