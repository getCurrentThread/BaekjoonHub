import React from 'react';

/**
 * 기본 설정 섹션 컴포넌트
 */
export const SettingsSection = ({ 
  visible = false,
  autoUpload,
  useCustomTemplate,
  onAutoUploadChange,
  onCustomTemplateChange
}) => {
  if (!visible) return null;

  return (
    <div className="section">
      <h2 className="section-title">기본 설정</h2>

      <div className="card">
        <div className="toggle-section">
          <div>
            <div className="toggle-label">자동 업로드</div>
            <div className="help-text">문제를 해결하면 자동으로 GitHub에 업로드됩니다.</div>
          </div>
          <label className="toggle">
            <input 
              type="checkbox" 
              id="autoUpload" 
              checked={autoUpload}
              onChange={onAutoUploadChange}
            />
            <span className="slider"></span>
            <span className="sr-only">자동 업로드 설정</span>
          </label>
        </div>

        <div className="toggle-section">
          <div>
            <div className="toggle-label">커스텀 템플릿 사용</div>
            <div className="help-text">파일명과 폴더 구조를 커스터마이징할 수 있습니다.</div>
          </div>
          <label className="toggle">
            <input 
              type="checkbox" 
              id="useCustomTemplate"
              checked={useCustomTemplate}
              onChange={onCustomTemplateChange}
            />
            <span className="slider"></span>
            <span className="sr-only">커스텀 템플릿 사용 설정</span>
          </label>
        </div>
      </div>
    </div>
  );
};