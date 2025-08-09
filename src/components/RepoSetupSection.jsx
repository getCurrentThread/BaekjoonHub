import React from 'react';

/**
 * GitHub 저장소 설정 섹션 컴포넌트
 */
export const RepoSetupSection = ({ 
  visible = true,
  repoType,
  repoName,
  repositories,
  onRepoTypeChange,
  onRepoNameChange,
  onRepoSelectChange,
  onConnectRepo,
  connectDisabled = true,
  isConnecting = false
}) => {
  if (!visible) return null;

  return (
    <div className="section">
      <h2 className="section-title">GitHub 저장소 설정</h2>

      <div className="tutorial-tip">
        <span className="tip-icon">💡</span>
        <strong>시작하기:</strong> GitHub 저장소를 연결하여 백준 문제 해결 기록을 자동으로 관리해보세요!
      </div>

      <div className="card">
        <div className="form-group">
          <label className="form-label" htmlFor="repoType">저장소 옵션</label>
          <select 
            id="repoType" 
            className="form-control"
            value={repoType}
            onChange={onRepoTypeChange}
          >
            <option value="">옵션을 선택하세요</option>
            <option value="new">새 저장소 생성</option>
            <option value="existing">기존 저장소 연결</option>
          </select>
          <div className="help-text">새로운 저장소를 만들거나 기존 저장소와 연결할 수 있습니다.</div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="repoName">저장소 이름</label>
          <input 
            type="text" 
            id="repoName" 
            className="form-control" 
            placeholder="username/repository-name"
            value={repoName}
            onChange={onRepoNameChange}
            style={{ display: repoType === 'new' ? 'block' : 'none' }}
          />
          <select 
            id="repoSelect" 
            className="form-control"
            onChange={onRepoSelectChange}
            style={{ display: repoType === 'existing' ? 'block' : 'none' }}
          >
            <option value="">저장소를 선택하세요</option>
            {repositories.map(repo => (
              <option key={repo.full_name} value={repo.full_name}>
                {repo.full_name}
              </option>
            ))}
          </select>
          <div className="help-text">형식: GitHub사용자명/저장소명 (예: john/baekjoon-solutions)</div>
        </div>

        <div className="button-group">
          <button 
            id="connectRepo" 
            className="button button-primary" 
            disabled={connectDisabled || isConnecting}
            onClick={onConnectRepo}
          >
            {isConnecting ? (
              <>
                <span>⏳</span> 연결 중...
              </>
            ) : (
              <>
                <span>🔗</span> 연결하기
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};