import PlatformHubBase from "@/commons/platformhub-base.js";
import { SubmissionChecker } from "@/commons/loader-service.js";
import { Toast } from "@/commons/toast.js";
import { checkEnable } from "@/commons/enable.js";
import { getObjectFromLocalStorage, STORAGE_KEYS } from "@/commons/storage.js";

import { parseData } from "@/programmers/parsing.js";
import uploadOneSolveProblemOnGit from "@/programmers/uploadfunctions.js";
import { startUpload, markUploadedCSS } from "@/programmers/util.js";

class ProgrammersHub extends PlatformHubBase {
  constructor() {
    super({
      platformName: "프로그래머스",
      loaderInterval: 2000,
    });
  }

  async init() {
    super.init();

    // Check if extension is enabled
    const enabled = await checkEnable();
    if (!enabled) {
      Toast.info("프로그래머스 Hub가 비활성화되어 있습니다.");
      return;
    }

    if (this.isProgrammersLessonPage()) {
      this.startSubmissionMonitoring();
    }
  }

  /**
   * Check if current page is a Programmers lesson page
   * @returns {boolean}
   */
  isProgrammersLessonPage() {
    return this.matchesUrl(["/learn/courses/30"]) && this.currentUrl.includes("lessons");
  }

  /**
   * Start monitoring for successful submissions
   */
  async startSubmissionMonitoring() {
    Toast.info("프로그래머스 문제 모니터링을 시작합니다.");
    
    // Get upload failed submissions setting
    const uploadFailedSubmissions = await getObjectFromLocalStorage(STORAGE_KEYS.UPLOAD_FAILED_SUBMISSIONS);
    
    let checker;
    if (uploadFailedSubmissions) {
      // Check for any modal header (both success and failure)
      checker = SubmissionChecker.createCustomChecker(() => {
        const modalHeader = document.querySelector("div.modal-header > h4");
        if (!modalHeader) return false;
        const text = modalHeader.textContent?.trim() || "";
        // Accept both success and failure messages
        return text === "정답" || text === "실패" || text === "오답" || text.includes("테스트");
      });
    } else {
      // Only check for success
      checker = SubmissionChecker.createTextChecker("div.modal-header > h4", "정답");
    }

    const onSuccess = async () => {
      const bojData = await this.createAndExecuteUploadHandler(parseData, uploadOneSolveProblemOnGit, markUploadedCSS, startUpload);
      await this.beginUpload(bojData, uploadOneSolveProblemOnGit, markUploadedCSS);
    };

    this.setupSubmissionMonitoring(checker, onSuccess);
  }
}

new ProgrammersHub();
