/**
 * Authentication Section Component - React version
 * GitHub authentication UI for popup
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
 * @param {object} props - Component properties  
 * @param {string} props.color - Color for Hub text
 * @returns {JSX.Element} Brand name span
 */
const BrandName = ({ color = "#f18500" }) => (
  <>
    Baekjoon
    <span style={{ color }}>Hub</span>
  </>
);

/**
 * Authentication Section Component
 * @param {object} props - Component properties
 * @param {function} props.onAuthenticate - Authentication click handler
 * @param {object} props.style - Additional styles
 * @returns {JSX.Element} Auth section element
 */
export const AuthSection = ({ onAuthenticate, style = {} }) => (
  <section id="auth_mode" style={style}>
    <p className="onboarding">
      Authenticate with GitHub to use
      <strong>
        <BrandName />
      </strong>
    </p>
    <button id="authenticate" className="secondary button" onClick={onAuthenticate}>
      <GitHubIcon />
      Authenticate
    </button>
  </section>
);