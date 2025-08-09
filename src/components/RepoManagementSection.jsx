import React from 'react';

/**
 * 저장소 관리 섹션 컴포넌트
 */
export const RepoManagementSection = ({ 
  visible = false,
  onUnlinkRepo
}) => {
  if (!visible) return null;

  return (
    <div className="section">
      <h2 className="section-title">저장소 관리</h2>

      <div className="card">
        <div className="form-group">
          <label className="form-label">연결 해제</label>
          <div className="help-text">현재 저장소와의 연결을 해제하고 새로운 저장소를 설정할 수 있습니다.</div>
          <div className="button-group" style={{ marginTop: '16px' }}>
            <button 
              className="button button-danger"
              onClick={onUnlinkRepo}
            >
              <span>🔓</span> 저장소 연결 해제
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};