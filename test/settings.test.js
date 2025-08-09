import { Builder, By, Key, until } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTest() {
  const testUsername = "testuser";
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

    // Navigate to a blank page first to ensure localStorage is cleared before extension page loads
    await driver.get("about:blank");

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

    // Navigate to the extension's settings page
    await driver.get(`chrome-extension://${extensionId}/settings.html`);

    console.log("Navigated to settings page, waiting for page to load...");

    // Wait for the page title to be correct
    await driver.wait(until.titleContains("BaekjoonHub Settings"), 15000);
    console.log("Settings page title confirmed.");

    // Wait for React app to be initialized by looking for any rendered content
    await driver.wait(async () => {
      const bodyText = await driver.findElement(By.css('body')).getText();
      console.log(`Checking if React app is loaded. Body text length: ${bodyText.length}`);
      return bodyText.length > 0;
    }, 30000, 'React app did not load within 30 seconds');

    console.log("React settings app appears to be loaded.");

    // Try to find common elements that should exist in the React app
    try {
      // Look for header or any visible text content
      const bodyElement = await driver.findElement(By.css('body'));
      const pageText = await bodyElement.getText();
      console.log("Page content found:", pageText.substring(0, 200) + (pageText.length > 200 ? "..." : ""));
      
      if (pageText.includes("BaekjoonHub") || pageText.includes("설정") || pageText.includes("GitHub")) {
        console.log("Settings page loaded successfully with React content!");
      } else {
        console.log("Settings page loaded but content may not be as expected.");
      }
    } catch (error) {
      console.log("Could not read page text:", error.message);
    }

  } catch (error) {
    console.error("Test failed:", error);
    try {
      const screenshot = await driver.takeScreenshot();
      fs.writeFileSync("settings_failure_screenshot.png", screenshot, "base64");
      console.log("Screenshot saved to settings_failure_screenshot.png");

      // Capture and print browser logs
      const logs = await driver.manage().logs().get('browser');
      console.log("Browser Logs:", logs);

    } catch (screenshotError) {
      console.error("Failed to take screenshot or logs:", screenshotError);
    }
  } finally {
    if (driver) {
      await driver.quit();
    }
  }
}

runTest();