/**
 * Commit Section Component - React version
 * Repository connection and enable toggle UI
 */

import { RepoLink } from './RepoLink.jsx';

/**
 * Toggle Switch Component
 * @param {object} props - Component properties
 * @param {boolean} props.checked - Toggle state
 * @param {function} props.onChange - Change handler
 * @param {string} props.id - Input ID
 * @returns {JSX.Element} Toggle switch element
 */
const ToggleSwitch = ({ checked = true, onChange, id = "enable_popup" }) => (
  <div className="auto-commit-container">
    <div className="auto-commit-label">Enabled</div>
    <div className="toggle-switch-container">
      <input 
        type="checkbox" 
        id={id} 
        className="toggle-switch-checkbox" 
        checked={checked}
        onChange={onChange}
      />
      <label htmlFor={id} className="toggle-switch-label">
        <span className="toggle-switch-inner"></span>
        <span className="toggle-switch-switch"></span>
      </label>
    </div>
  </div>
);

/**
 * Repository URL Display Component
 * @param {object} props - Component properties
 * @param {string} props.repoName - Repository name
 * @returns {JSX.Element} Repository URL element
 */
const RepoUrl = ({ repoName }) => (
  <p id="repo_url" className="small header">
    {repoName && <RepoLink repoName={repoName} />}
  </p>
);

/**
 * Commit Section Component
 * @param {object} props - Component properties
 * @param {string} props.repoName - Repository name
 * @param {boolean} props.isEnabled - Enable toggle state
 * @param {function} props.onToggleChange - Toggle change handler
 * @param {object} props.style - Additional styles
 * @returns {JSX.Element} Commit section element
 */
export const CommitSection = ({ repoName, isEnabled = true, onToggleChange, style = {} }) => (
  <section id="commit_mode" style={style}>
    <RepoUrl repoName={repoName} />
    <ToggleSwitch 
      checked={isEnabled} 
      onChange={onToggleChange}
    />
  </section>
);