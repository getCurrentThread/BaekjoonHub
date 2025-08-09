/**
 * Hook Setup Section Component - React version
 * Repository hook setup UI for popup
 */

/**
 * GitHub Icon Component
 * @returns {JSX.Element} GitHub icon
 */
const GitHubIcon = () => (
  <i className="icon github" aria-hidden="true"></i>
);

/**
 * Brand Name Component
 * @returns {JSX.Element} Brand name with blue Hub
 */
const BrandName = () => (
  <>
    Baekjoon
    <span style={{ color: '#0078c3' }}>Hub</span>
  </>
);

/**
 * Hook Setup Section Component
 * @param {object} props - Component properties
 * @param {string} props.hookUrl - Hook setup URL
 * @param {object} props.style - Additional styles
 * @returns {JSX.Element} Hook section element
 */
export const HookSection = ({ hookUrl = "", style = {} }) => (
  <section id="hook_mode" style={style}>
    <p className="onboarding">
      Set up repository hook to use
      <strong>
        <BrandName />
      </strong>
    </p>
    <a id="hook_URL" href={hookUrl} target="_blank" className="secondary button">
      <GitHubIcon />
      Set up Hook
    </a>
  </section>
);