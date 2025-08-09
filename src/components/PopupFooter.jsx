/**
 * Popup Footer Component - React version
 * Footer section with social links
 */

/**
 * Social Link Icon Component
 * @param {object} props - Component properties
 * @param {string} props.iconClass - Icon class name
 * @returns {JSX.Element} Icon element
 */
const SocialIcon = ({ iconClass }) => (
  <i className={`${iconClass} icon`} aria-hidden="true"></i>
);

/**
 * Popup Footer Component
 * @param {object} props - Component properties
 * @param {string} props.settingsUrl - Settings page URL
 * @returns {JSX.Element} Footer element
 */
export const PopupFooter = ({ settingsUrl = "settings.html" }) => (
  <footer id="socials" className="sixteen wide column">
    <a title="Settings" id="settings_URL" href={settingsUrl} target="_blank">
      <SocialIcon iconClass="settings" />
    </a>
    <a title="BaekjoonHub GitHub" href="https://github.com/BaekjoonHub/BaekjoonHub" target="_blank">
      <SocialIcon iconClass="github" />
    </a>
  </footer>
);