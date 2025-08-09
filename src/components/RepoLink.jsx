/**
 * Repository Link Component - React version
 * Component for displaying GitHub repository link
 */

/**
 * Repository Link Component
 * @param {object} props - Component properties
 * @param {string} props.repoName - Repository name (e.g., "username/repository")
 * @returns {JSX.Element} Repository link element
 */
export const RepoLink = ({ repoName }) => (
  <span>
    Your Repo: <a 
      target="_blank" 
      style={{ color: 'cadetblue !important' }}
      href={`https://github.com/${repoName}`}
    >
      {repoName}
    </a>
  </span>
);