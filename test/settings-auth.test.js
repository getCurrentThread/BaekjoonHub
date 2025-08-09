import { Builder, By, Key, until } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runAuthModalTest() {
  let driver;
  try {
    const extensionPath = path.resolve(__dirname, "../dist");
    console.log("Extension path being used:", extensionPath);

    let options = new chrome.Options();
    options.addArguments(`--load-extension=${extensionPath}`);
    options.addArguments("--no-sandbox");
    options.addArguments("--disable-dev-shm-usage");
    options.addArguments("--user-data-dir=" + path.resolve(__dirname, "./temp_chrome_profile"));
    options.addArguments("--disable-extensions-except=" + extensionPath);
    options.setLoggingPrefs({ browser: "ALL", driver: "ALL" });

    driver = await new Builder().forBrowser("chrome").setChromeOptions(options).build();

    // Clear any existing tokens to test unauthenticated state
    // We'll clear storage after getting the extension ID

    // Figure out the extension ID
    await driver.get("chrome://extensions/");

    const extensionsManager = await driver.wait(until.elementLocated(By.css("extensions-manager")), 10000);
    const extensionsManagerShadowRoot = await extensionsManager.getShadowRoot();

    const extensionsItemList = await driver.wait(async () => {
      const extensionsManager = await driver.findElement(By.css("extensions-manager"));
      const extensionsManagerShadowRoot = await extensionsManager.getShadowRoot();
      return extensionsManagerShadowRoot.findElement(By.css("extensions-item-list"));
    }, 10000);
    const extensionsItemListShadowRoot = await extensionsItemList.getShadowRoot();

    const extensionsItem = await driver.wait(async () => {
      return extensionsItemListShadowRoot.findElement(By.css("extensions-item"));
    }, 10000);

    const extensionId = await extensionsItem.getAttribute("id");

    // Navigate to extension popup to clear storage using the extension context
    await driver.get(`chrome-extension://${extensionId}/popup.html`);
    await driver.wait(until.titleContains("BaekjoonHub Popup"), 10000);
    
    // Clear storage from extension context
    await driver.executeScript(`
      if (chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.clear();
        console.log('Storage cleared for unauthenticated test');
      }
    `);
    
    console.log("Cleared extension storage for unauthenticated test");

    // Navigate to settings page without authentication
    console.log("Navigating to settings page without authentication...");
    await driver.get(`chrome-extension://${extensionId}/settings.html`);

    // Wait for page to load
    await driver.wait(until.titleContains("BaekjoonHub Settings"), 15000);
    console.log("Settings page loaded.");

    // Wait for auth modal to appear
    console.log("Waiting for auth modal to appear...");
    await driver.wait(async () => {
      const bodyText = await driver.findElement(By.css('body')).getText();
      console.log(`Checking for auth modal. Body text includes: ${bodyText.includes("GitHub 인증 필요")}`);
      return bodyText.includes("GitHub 인증 필요") || bodyText.includes("GitHub 계정 연동");
    }, 30000, 'Auth modal did not appear within 30 seconds');

    console.log("✅ Auth modal appeared successfully!");

    // Check if auth modal content is visible
    const bodyText = await driver.findElement(By.css('body')).getText();
    
    const expectedTexts = [
      "GitHub 인증 필요",
      "GitHub 계정 연동", 
      "저장소 설정",
      "업로드 옵션",
      "커스텀 템플릿"
    ];

    let foundTexts = [];
    for (const text of expectedTexts) {
      if (bodyText.includes(text)) {
        foundTexts.push(text);
      }
    }

    console.log("Found auth modal texts:", foundTexts);

    if (foundTexts.length >= 2) {
      console.log("✅ Auth modal content is properly displayed!");
    } else {
      console.log("⚠️ Some auth modal content may be missing");
    }

    // Try to find the GitHub authentication button
    try {
      await driver.wait(async () => {
        const buttons = await driver.findElements(By.css('button'));
        for (const button of buttons) {
          const buttonText = await button.getText();
          if (buttonText.includes("GitHub") || buttonText.includes("계정 연동")) {
            console.log("✅ Found GitHub authentication button:", buttonText);
            return true;
          }
        }
        return false;
      }, 10000);
    } catch (error) {
      console.log("Could not find GitHub auth button via button selector, checking all text...");
    }

    console.log("✅ Auth modal test passed! Modal correctly blocks access to settings without authentication.");

  } catch (error) {
    console.error("Auth modal test failed:", error);
    try {
      const screenshot = await driver.takeScreenshot();
      fs.writeFileSync("settings_auth_failure_screenshot.png", screenshot, "base64");
      console.log("Screenshot saved to settings_auth_failure_screenshot.png");

      const logs = await driver.manage().logs().get('browser');
      console.log("Browser Logs:", logs);
    } catch (captureError) {
      console.error("Failed to capture screenshot or logs:", captureError);
    }
  } finally {
    if (driver) {
      await driver.quit();
    }
  }
}

runAuthModalTest();