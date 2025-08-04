import PlatformHubBase from "@/commons/platformhub-base.js";
import { SubmissionChecker } from "@/commons/loader-service.js";
import { Toast } from "@/commons/toast.js";
import { checkEnable } from "@/commons/enable.js";
import { getObjectFromLocalStorage, STORAGE_KEYS } from "@/commons/storage.js";

import { parseData } from "@/goormlevel/parsing.js";
import uploadOneSolveProblemOnGit from "@/goormlevel/uploadfunctions.js";
import { startUpload, markUploadedCSS } from "@/goormlevel/util.js";
class GoormLevelHub extends PlatformHubBase {
  constructor() {
    super({
      platformName: "구름레벨",
      loaderInterval: 2000,
    });
  }

  async init() {
    super.init();

    // Check if extension is enabled
    const enabled = await checkEnable();
    if (!enabled) {
      Toast.info("구름레벨 Hub가 비활성화되어 있습니다.");
      return;
    }

    if (this.isGoormLevelExamPage()) {
      this.startSubmissionMonitoring();
    }
  }

  /**
   * Check if current page is a GoormLevel exam page
   * @returns {boolean}
   */
  isGoormLevelExamPage() {
    return /^\/exam\/\d+\/[^/]+\/quiz\/1$/.test(this.currentPathname);
  }

  /**
   * Start monitoring for successful submissions
   */
  async startSubmissionMonitoring() {
    Toast.info("구름레벨 문제 모니터링을 시작합니다.");
    
    // Get upload failed submissions setting
    const uploadFailedSubmissions = await getObjectFromLocalStorage(STORAGE_KEYS.UPLOAD_FAILED_SUBMISSIONS);
    
    let checker;
    if (uploadFailedSubmissions) {
      // Check for any submission result (both success and failure)
      checker = SubmissionChecker.createMultiStepChecker([
        () => {
          const activeSubmitTab = this.querySelectorAll("#FrameBody li.nav-item > a.nav-link.active").find((element) => element.textContent === "제출 결과");
          return Boolean(activeSubmitTab);
        },
        () => {
          // Check for any result (success or failure)
          const resultSpans = this.querySelectorAll("#FrameBody div > p[class] > span");
          const hasResult = resultSpans.find((element) => {
            const text = element.textContent || "";
            return text === "정답입니다." || text === "오답" || text.includes("실패") || text.includes("틀렸습니다");
          });
          return Boolean(hasResult);
        },
      ]);
    } else {
      // Only check for success
      checker = SubmissionChecker.createMultiStepChecker([
        () => {
          const activeSubmitTab = this.querySelectorAll("#FrameBody li.nav-item > a.nav-link.active").find((element) => element.textContent === "제출 결과");
          return Boolean(activeSubmitTab);
        },
        () => {
          const result = this.querySelectorAll("#FrameBody div > p[class] > span").find((element) => element.textContent === "정답입니다.");
          return Boolean(result);
        },
      ]);
    }

    const onSuccess = async () => {
      const parsedData = await parseData();

      if (parsedData) {
        startUpload();
        const { examSequence, quizNumber, message, directory, fileName, readme, code } = parsedData;
        const uploadData = { code, readme, directory, fileName, message, examSequence, quizNumber };

        await this.beginUpload(uploadData, uploadOneSolveProblemOnGit, markUploadedCSS);
      }
    };

    this.setupSubmissionMonitoring(checker, onSuccess);
  }
}

new GoormLevelHub();
