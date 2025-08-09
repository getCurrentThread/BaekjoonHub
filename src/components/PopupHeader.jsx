/**
 * Popup Header Component - React version
 * Header section for BaekjoonHub popup
 */

/**
 * Popup Header Component
 * @returns {JSX.Element} Header element
 */
export const PopupHeader = () => (
  <header className="sixteen wide center aligned column">
    <h1 id="title">
      Baekjoon
      <span style={{ color: '#0078c3' }}>Hub</span>
    </h1>
    <p id="caption">Sync your code from BOJ to GitHub</p>
  </header>
);