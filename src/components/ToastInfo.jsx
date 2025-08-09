import React from 'react';

/**
 * Toast 정보 메시지 컴포넌트  
 * 업로드 시작 및 일반 정보 메시지 표시
 */
export function ToastInfoMessage({ message }) {
  return (
    <div className="toast-info-content">
      <span>{message}</span>
    </div>
  );
}

/**
 * Toast 컨테이너에 React 컴포넌트를 렌더링하는 유틸리티
 */
export function renderToastInfo(container, message) {
  return <ToastInfoMessage message={message} />;
}