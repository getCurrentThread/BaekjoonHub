/**
 * Popup Application Component - React version
 * Main popup application with state management
 */
import { PopupHeader } from './PopupHeader.jsx';
import { PopupFooter } from './PopupFooter.jsx';
import { AuthSection } from './AuthSection.jsx';
import { HookSection } from './HookSection.jsx';
import { CommitSection } from './CommitSection.jsx';

/**
 * Main Popup Application Component
 * @param {object} props - Component properties
 * @param {function} props.onAuthenticate - Authentication handler
 * @param {string} props.authMode - Current authentication mode ('auth', 'hook', 'commit')
 * @param {string} props.repoName - Repository name
 * @param {boolean} props.isEnabled - Enable status
 * @param {function} props.onToggleChange - Enable toggle handler
 * @param {string} props.settingsUrl - Settings page URL
 * @param {string} props.hookUrl - Hook setup URL
 * @param {boolean} props.isLoading - Loading state
 * @returns {JSX.Element} Complete popup application
 */
export const PopupApp = ({ 
  onAuthenticate,
  authMode = 'auth',
  repoName = '',
  isEnabled = true,
  onToggleChange,
  settingsUrl,
  hookUrl,
  isLoading = false
}) => (
  <div className="grid container">
    <PopupHeader />
    
    <main className="sixteen wide center aligned column">
      <AuthSection 
        onAuthenticate={onAuthenticate}
        style={{ display: authMode === 'auth' ? 'block' : 'none' }}
      />
      
      <HookSection 
        hookUrl={hookUrl}
        style={{ display: authMode === 'hook' ? 'block' : 'none' }}
      />
      
      <CommitSection 
        repoName={repoName}
        isEnabled={isEnabled}
        onToggleChange={onToggleChange}
        style={{ display: authMode === 'commit' ? 'block' : 'none' }}
      />
    </main>
    
    <PopupFooter settingsUrl={settingsUrl} />
  </div>
);