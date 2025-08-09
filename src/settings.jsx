/**
 * BaekjoonHub Settings - React version
 * Chrome extension settings page with React components and hooks
 */

import React, { useState, useEffect, useActionState, useOptimistic, startTransition } from 'react';
import { createRoot } from 'react-dom/client';
import { getObjectFromLocalStorage, saveObjectInLocalStorage } from "./scripts/commons/storage.js";
import { STORAGE_KEYS } from "./scripts/constants/registry.js";
import beginOAuth2 from "./scripts/commons/oauth2.js";
import { parseTemplateString } from "safe-template-parser";
import { getTextTransforms } from "./scripts/commons/text-transforms.js";
import log from "./scripts/commons/logger.js";
import { SettingsApp } from "@components/SettingsApp.jsx";
import { AuthRequiredModal } from "@components/AuthRequiredModal.jsx";

/**
 * Main Settings Component with React Hooks
 */
const SettingsMain = () => {
  // 인증 상태
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authCheckComplete, setAuthCheckComplete] = useState(false);
  
  // 연결 상태
  const [connected, setConnected] = useState(false);
  const [repoName, setRepoName] = useState('');

  // 메시지 상태 (React 19의 useActionState와 통합)
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // 저장소 설정 상태
  const [repoType, setRepoType] = useState('');
  const [repositories, setRepositories] = useState([]);
  const [githubUserInfo, setGithubUserInfo] = useState({ username: '', repositories: [] });

  // 설정 상태
  const [autoUpload, setAutoUpload] = useState(true);
  const [useCustomTemplate, setUseCustomTemplate] = useState(false);
  const [templateString, setTemplateString] = useState("{{language}}/{{removeAfterSpace(level)}}/{{problemId}}. {{safe(title)}}");
  const [templatePreview, setTemplatePreview] = useState('Python/Silver/1000. A+B.py');

  /**
   * 인증 상태 확인
   */
  const checkAuthStatus = async () => {
    try {
      const token = await getObjectFromLocalStorage(STORAGE_KEYS.TOKEN);
      
      log.info('Settings: Checking auth status', { hasToken: !!token });
      
      if (token) {
        // 토큰이 유효한지 GitHub API로 확인
        try {
          const response = await fetch('https://api.github.com/user', {
            headers: { Authorization: `token ${token}` }
          });
          
          if (response.ok) {
            setIsAuthenticated(true);
            log.info('Settings: Authentication verified');
          } else {
            // 토큰이 만료되었거나 잘못됨
            log.warn('Settings: Token invalid, requiring re-authentication');
            setIsAuthenticated(false);
            // 잘못된 토큰 삭제
            await saveObjectInLocalStorage({ [STORAGE_KEYS.TOKEN]: null });
          }
        } catch (error) {
          log.error('Settings: Token validation error', error);
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
        log.info('Settings: No token found, authentication required');
      }
    } catch (error) {
      log.error('Settings: Auth check error', error);
      setIsAuthenticated(false);
    } finally {
      setAuthCheckComplete(true);
    }
  };

  /**
   * 초기 설정 로드
   */
  const loadInitialSettings = async () => {
    try {
      const data = await getObjectFromLocalStorage([
        STORAGE_KEYS.MODE_TYPE, 
        STORAGE_KEYS.HOOK, 
        STORAGE_KEYS.TOKEN, 
        STORAGE_KEYS.ENABLE, 
        STORAGE_KEYS.USE_CUSTOM_TEMPLATE, 
        STORAGE_KEYS.DIR_TEMPLATE
      ]);

      const modeType = data[STORAGE_KEYS.MODE_TYPE];
      const hook = data[STORAGE_KEYS.HOOK];
      const token = data[STORAGE_KEYS.TOKEN];
      const enabled = data[STORAGE_KEYS.ENABLE];
      const customTemplate = data[STORAGE_KEYS.USE_CUSTOM_TEMPLATE];
      const dirTemplate = data[STORAGE_KEYS.DIR_TEMPLATE];

      log.info('Settings: Initial data loaded', { modeType, hook, enabled, customTemplate, dirTemplate });

      // 연결 상태 설정
      if (modeType === 'commit' && hook && token) {
        setConnected(true);
        setRepoName(hook);
      }

      // 설정값 적용
      setAutoUpload(enabled !== false);
      setUseCustomTemplate(customTemplate || false);
      setTemplateString(dirTemplate || "{{language}}/{{removeAfterSpace(level)}}/{{problemId}}. {{safe(title)}}");

      updateTemplatePreview(dirTemplate || "{{language}}/{{removeAfterSpace(level)}}/{{problemId}}. {{safe(title)}}");
    } catch (error) {
      log.error('Settings: Error loading initial settings', error);
      setErrorMessage('설정을 불러오는 중 오류가 발생했습니다.');
    }
  };

  /**
   * GitHub 사용자 정보 및 저장소 목록 가져오기
   */
  const fetchGitHubUserInfo = async () => {
    try {
      const token = await getObjectFromLocalStorage(STORAGE_KEYS.TOKEN);
      if (!token) return;

      const response = await fetch('https://api.github.com/user', {
        headers: { Authorization: `token ${token}` }
      });

      if (!response.ok) {
        throw new Error('GitHub API request failed');
      }

      const userInfo = await response.json();
      
      // 저장소 목록 가져오기
      const reposResponse = await fetch('https://api.github.com/user/repos?per_page=100', {
        headers: { Authorization: `token ${token}` }
      });

      const repos = await reposResponse.json();

      setGithubUserInfo({
        username: userInfo.login,
        repositories: repos
      });
      setRepositories(repos);

      log.info('Settings: GitHub user info fetched', { username: userInfo.login, repoCount: repos.length });
    } catch (error) {
      log.error('Settings: Error fetching GitHub info', error);
    }
  };

  /**
   * 템플릿 미리보기 업데이트
   */
  const updateTemplatePreview = (template) => {
    try {
      const transforms = getTextTransforms();
      const sampleData = {
        platform: '백준',
        problemId: '1000',
        title: 'A+B',
        level: 'Bronze V',
        language: 'Python'
      };

      const preview = parseTemplateString(template, sampleData, transforms);
      setTemplatePreview(preview + '.py');
    } catch (error) {
      log.error('Settings: Template preview error', error);
      setTemplatePreview('미리보기 오류');
    }
  };

  // 메시지 표시 함수
  const showMessage = (type, message, autoHide = true) => {
    if (type === 'error') {
      setErrorMessage(message);
      setSuccessMessage('');
      if (autoHide) {
        setTimeout(() => setErrorMessage(''), 5000);
      }
    } else if (type === 'success') {
      setSuccessMessage(message);
      setErrorMessage('');
      if (autoHide) {
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    }
  };

  // 이벤트 핸들러들
  const handleRepoTypeChange = (event) => {
    const value = event.target.value;
    setRepoType(value);
    
    if (value === 'existing' && repositories.length === 0) {
      fetchGitHubUserInfo();
    }
  };

  const handleRepoNameChange = (event) => {
    setRepoName(event.target.value);
  };

  const handleRepoSelectChange = (event) => {
    setRepoName(event.target.value);
  };

  // React 19 useActionState를 사용한 비동기 액션
  const connectRepoAction = async (prevState, formData) => {
    try {
      if (!repoName) {
        return { error: '저장소 이름을 입력해주세요.' };
      }

      // GitHub API로 저장소 존재 확인
      const token = await getObjectFromLocalStorage(STORAGE_KEYS.TOKEN);
      if (!token) {
        beginOAuth2();
        return { error: 'GitHub 인증이 필요합니다.' };
      }

      const response = await fetch(`https://api.github.com/repos/${repoName}`, {
        headers: { Authorization: `token ${token}` }
      });

      if (repoType === 'new') {
        // 새 저장소 생성
        const createResponse = await fetch('https://api.github.com/user/repos', {
          method: 'POST',
          headers: {
            Authorization: `token ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: repoName.split('/')[1],
            description: 'Algorithm solutions from BaekjoonHub',
            private: false
          })
        });

        if (!createResponse.ok) {
          throw new Error('저장소 생성에 실패했습니다.');
        }
      } else if (!response.ok) {
        throw new Error('저장소를 찾을 수 없습니다.');
      }

      // 저장소 연결 완료
      await saveObjectInLocalStorage({
        [STORAGE_KEYS.MODE_TYPE]: 'commit',
        [STORAGE_KEYS.HOOK]: repoName
      });

      startTransition(() => {
        setConnected(true);
      });
      
      log.info('Settings: Repository connected', { repoName, type: repoType });
      return { success: '저장소 연결이 완료되었습니다!' };
    } catch (error) {
      log.error('Settings: Repository connection error', error);
      return { error: error.message || '저장소 연결 중 오류가 발생했습니다.' };
    }
  };

  const [connectState, connectAction, isPending] = useActionState(connectRepoAction, { success: '', error: '' });

  const handleConnectRepo = () => {
    connectAction();
  };

  const handleAutoUploadChange = async (event) => {
    const isChecked = event.target.checked;
    setAutoUpload(isChecked);
    await saveObjectInLocalStorage({ [STORAGE_KEYS.ENABLE]: isChecked });
    log.info('Settings: Auto upload changed', { enabled: isChecked });
  };

  const handleCustomTemplateChange = async (event) => {
    const isChecked = event.target.checked;
    setUseCustomTemplate(isChecked);
    await saveObjectInLocalStorage({ [STORAGE_KEYS.USE_CUSTOM_TEMPLATE]: isChecked });
    log.info('Settings: Custom template changed', { enabled: isChecked });
  };

  const handleTemplateChange = (event) => {
    const value = event.target.value;
    setTemplateString(value);
    updateTemplatePreview(value);
  };

  const handleTemplateInsert = (text) => {
    const input = document.getElementById('templateString');
    if (input) {
      const cursorPos = input.selectionStart;
      const newValue = templateString.slice(0, cursorPos) + text + templateString.slice(cursorPos);
      setTemplateString(newValue);
      updateTemplatePreview(newValue);
      
      // 커서 위치 복원
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(cursorPos + text.length, cursorPos + text.length);
      }, 0);
    }
  };

  const handlePresetSelect = (template) => {
    setTemplateString(template);
    updateTemplatePreview(template);
  };

  const handleSaveTemplate = async () => {
    try {
      await saveObjectInLocalStorage({ [STORAGE_KEYS.DIR_TEMPLATE]: templateString });
      showMessage('success', '템플릿이 저장되었습니다!');
      log.info('Settings: Template saved', { template: templateString });
    } catch (error) {
      log.error('Settings: Template save error', error);
      showMessage('error', '템플릿 저장 중 오류가 발생했습니다.');
    }
  };

  const handleResetTemplate = () => {
    const defaultTemplate = "{{language}}/{{removeAfterSpace(level)}}/{{problemId}}. {{safe(title)}}";
    setTemplateString(defaultTemplate);
    updateTemplatePreview(defaultTemplate);
  };

  const handleUnlinkRepo = async () => {
    try {
      if (confirm('정말로 저장소 연결을 해제하시겠습니까?')) {
        await saveObjectInLocalStorage({
          [STORAGE_KEYS.MODE_TYPE]: null,
          [STORAGE_KEYS.HOOK]: null
        });

        setConnected(false);
        setRepoName('');
        setRepoType('');
        showMessage('success', '저장소 연결이 해제되었습니다.');
        
        log.info('Settings: Repository unlinked');
      }
    } catch (error) {
      log.error('Settings: Repository unlink error', error);
      showMessage('error', '연결 해제 중 오류가 발생했습니다.');
    }
  };

  // 인증 상태 확인 Effect
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // 인증 완료 후 초기 설정 로드 Effect
  useEffect(() => {
    if (isAuthenticated && authCheckComplete) {
      loadInitialSettings();
    }
  }, [isAuthenticated, authCheckComplete]);

  // OAuth 완료 후 돌아왔을 때 인증 상태 다시 확인
  useEffect(() => {
    const handleStorageChange = (changes, namespace) => {
      if (namespace === 'local' && changes[STORAGE_KEYS.TOKEN]) {
        log.info('Settings: Token changed, rechecking auth status');
        checkAuthStatus();
      }
    };

    // Chrome storage change listener 추가
    if (chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(handleStorageChange);
      
      return () => {
        chrome.storage.onChanged.removeListener(handleStorageChange);
      };
    }
  }, []);

  // 인증 확인 중이면 로딩 표시
  if (!authCheckComplete) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ fontSize: '24px' }}>🔄</div>
        <div>인증 상태를 확인하는 중...</div>
      </div>
    );
  }

  return (
    <>
      {/* 인증이 필요하면 강제 모달 표시 */}
      <AuthRequiredModal 
        isOpen={!isAuthenticated} 
        onClose={() => {}} 
      />
      
      {/* 인증된 경우에만 설정 앱 표시 */}
      {isAuthenticated && (
        <SettingsApp
          // 연결 상태
          connected={connected}
          repoName={repoName}

          // 메시지 (React 19 useActionState 통합)
          errorMessage={connectState.error || errorMessage}
          successMessage={connectState.success || successMessage}
          isConnecting={isPending}

          // 저장소 설정
          repoType={repoType}
          repositories={repositories}

          // 설정값
          autoUpload={autoUpload}
          useCustomTemplate={useCustomTemplate}
          templateString={templateString}
          templatePreview={templatePreview}

          // 이벤트 핸들러
          onRepoTypeChange={handleRepoTypeChange}
          onRepoNameChange={handleRepoNameChange}
          onRepoSelectChange={handleRepoSelectChange}
          onConnectRepo={handleConnectRepo}
          onAutoUploadChange={handleAutoUploadChange}
          onCustomTemplateChange={handleCustomTemplateChange}
          onTemplateChange={handleTemplateChange}
          onTemplateInsert={handleTemplateInsert}
          onPresetSelect={handlePresetSelect}
          onSaveTemplate={handleSaveTemplate}
          onResetTemplate={handleResetTemplate}
          onUnlinkRepo={handleUnlinkRepo}
        />
      )}
    </>
  );
};

// Initialize React app when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  log.info("DOMContentLoaded: Initializing React settings page.");
  
  const container = document.body;
  const root = createRoot(container);
  
  root.render(<SettingsMain />);
});