/**
 * Toast Component - React version
 * Modern toast notification component using React
 */

import log from "@/commons/logger.js";

export const ToastType = {
  Danger: "#eb3b5a",
  Warning: "#fdcb6e", 
  Success: "#00b894",
  Info: "#3e67ec",
};

/**
 * Toast JSX Component
 * @param {object} props - Component properties
 * @param {string} props.message - Toast message
 * @param {string} props.type - Toast type (success, danger, warning, info)
 * @param {function} props.onRemove - Remove callback
 * @returns {JSX.Element} Toast element
 */
const ToastComponent = ({ message, type = "info", onRemove }) => {
  // 타입별 색상 설정
  const typeColors = {
    success: { bg: '#10B981', color: '#fff' },
    danger: { bg: '#EF4444', color: '#fff' },
    warning: { bg: '#F59E0B', color: '#fff' },
    info: { bg: '#3B82F6', color: '#fff' }
  };

  // 타입별 이모지
  const typeEmojis = {
    success: '✅',
    danger: '❌', 
    warning: '⚠️',
    info: 'ℹ️'
  };

  const colors = typeColors[type] || typeColors.info;
  const emoji = typeEmojis[type] || '';
  const displayMessage = emoji ? `${emoji} ${message}` : message;

  const baseStyles = {
    position: 'fixed',
    bottom: '30px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: colors.bg,
    color: colors.color,
    padding: '12px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    zIndex: '10000',
    opacity: '0',
    transition: 'all 0.3s ease-in-out',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica Neue", "Arial", sans-serif',
    minWidth: '200px',
    maxWidth: '500px',
    textAlign: 'center',
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  };

  return (
    <div 
      className="bj-toast"
      style={baseStyles}
      onClick={onRemove}
    >
      {displayMessage}
    </div>
  );
};

export class Toast {
  constructor(message, color, time, type = "info") {
    log.debug("Constructor", message);
    this.message = message;
    this.color = color;
    this.time = time;
    this.type = type;
    this.element = null;
    
    this.createToast();
    log.debug("Toast created");
  }

  createToast() {
    // JSX 컴포넌트 생성
    this.element = (
      <ToastComponent 
        message={this.message}
        type={this.type}
        onRemove={() => this.remove()}
      />
    );

    // 기존 토스트들을 위로 올리기
    const existingToasts = document.querySelectorAll('.bj-toast');
    existingToasts.forEach(el => {
      const currentBottom = parseInt(el.style.bottom) || 30;
      el.style.bottom = `${currentBottom + 60}px`;
    });

    document.body.appendChild(this.element);

    // Fade in 애니메이션
    requestAnimationFrame(() => {
      this.element.style.opacity = '1';
    });

    // 자동 제거 타이머
    this.autoRemoveTimer = setTimeout(() => {
      this.remove();
    }, this.time);
  }

  remove() {
    if (this.element && this.element.parentNode) {
      // 자동 제거 타이머가 있다면 클리어
      if (this.autoRemoveTimer) {
        clearTimeout(this.autoRemoveTimer);
        this.autoRemoveTimer = null;
      }

      // Fade out 애니메이션
      this.element.style.opacity = '0';
      this.element.style.transform = 'translateX(-50%) translateY(20px)';
      
      setTimeout(() => {
        if (this.element && this.element.parentNode) {
          this.element.remove();
        }
      }, 300);
    }
  }

  // 정적 메서드들 - 기존 API 호환성 유지
  static raiseToast(message, duration = 4000) {
    return new Toast(message, ToastType.Danger, duration, "danger");
  }

  static success(message, duration = 4000) {
    return new Toast(message, ToastType.Success, duration, "success");
  }

  static warning(message, duration = 4000) {
    return new Toast(message, ToastType.Warning, duration, "warning");
  }

  static info(message, duration = 4000) {
    return new Toast(message, ToastType.Info, duration, "info");
  }

  static danger(message, duration = 4000) {
    return new Toast(message, ToastType.Danger, duration, "danger");
  }
}

// JSX 버전의 showToast 함수
export function showToast(message, color = '#333', duration = 3000) {
  // 타입 추론
  let type = 'info';
  if (color === '#10B981' || color === ToastType.Success) type = 'success';
  else if (color === '#EF4444' || color === ToastType.Danger) type = 'danger';
  else if (color === '#F59E0B' || color === ToastType.Warning) type = 'warning';

  const toast = (
    <ToastComponent 
      message={message}
      type={type}
      onRemove={() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
      }}
    />
  );

  // 커스텀 색상 적용 (타입이 추론되지 않은 경우)
  if (!['success', 'danger', 'warning', 'info'].includes(type)) {
    toast.style.backgroundColor = color;
  }

  // 기존 토스트가 있으면 위로 올리기
  const existingToasts = document.querySelectorAll('.bj-toast');
  existingToasts.forEach(el => {
    const currentBottom = parseInt(el.style.bottom) || 30;
    el.style.bottom = `${currentBottom + 60}px`;
  });

  document.body.appendChild(toast);

  // Fade in
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
  });

  // Auto remove
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, duration);

  return toast;
}