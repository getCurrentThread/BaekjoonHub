import React from 'react';

/**
 * Toast 실패 메시지 컴포넌트
 * 업로드 실패 시 표시되는 메시지
 */
export function ToastFailureMessage() {
  return (
    <div className="toast-failure-content">
      <span>🚫 업로드 실패! 다시 시도해주세요.</span>
    </div>
  );
}

/**
 * Toast 컨테이너에 React 컴포넌트를 렌더링하는 유틸리티
 */
export function renderToastFailure(container) {
  return <ToastFailureMessage />;
}