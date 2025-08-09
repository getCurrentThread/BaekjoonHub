import React from 'react';

/**
 * 메시지 박스 컴포넌트 (오류/성공 메시지)
 */
export const MessageBox = ({ type, message, visible = false }) => {
  if (!visible || !message) return null;

  return (
    <div className={`message ${type}`}>
      {message}
    </div>
  );
};