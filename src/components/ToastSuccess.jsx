import React from 'react';
import { LinkIconContainer } from './LinkIcon.jsx';

/**
 * Toast 성공 메시지 컴포넌트
 * 업로드 성공 시 GitHub 링크와 함께 표시되는 메시지
 */
export function ToastSuccessMessage({ problemInfo, onGitHubClick }) {
  return (
    <div className="toast-success-content">
      <div className="success-message">
        <span>✨ 업로드 성공! {problemInfo}</span>
        <LinkIconContainer />
      </div>
      <div 
        className="info-text"
        style={{
          fontSize: '13px',
          opacity: '0.8',
          marginTop: '6px',
          fontWeight: '400'
        }}
      >
        클릭하여 GitHub에서 확인 →
      </div>
    </div>
  );
}

/**
 * Toast 컨테이너에 React 컴포넌트를 렌더링하는 유틸리티
 */
export function renderToastSuccess(container, problemInfo, onGitHubClick) {
  return (
    <ToastSuccessMessage 
      problemInfo={problemInfo} 
      onGitHubClick={onGitHubClick}
    />
  );
}