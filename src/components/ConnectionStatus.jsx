/**
 * Connection Status Components - React version
 * Components for displaying GitHub repository connection status
 */

/**
 * Connected Status Component
 * @param {object} props - Component properties
 * @param {string} props.repoName - Repository name
 * @returns {JSX.Element} Connected status element
 */
export const ConnectedStatus = ({ repoName }) => (
  <div className="status-connected">
    <div className="repo-info">
      <svg viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
      </svg>
      <strong>연결됨:</strong> {repoName}
    </div>
  </div>
);

/**
 * Disconnected Status Component
 * @returns {JSX.Element} Disconnected status element
 */
export const DisconnectedStatus = () => (
  <div className="status-disconnected">
    GitHub 저장소가 연결되지 않았습니다. 아래에서 저장소를 설정해주세요.
  </div>
);

/**
 * Auth Error Message Component
 * @param {object} props - Component properties  
 * @param {string} props.message - Error message
 * @returns {JSX.Element} Auth error element
 */
export const AuthErrorMessage = ({ message }) => (
  <div>
    {message} <button id="authorize_button" className="button button-primary">인증하기</button>
  </div>
);