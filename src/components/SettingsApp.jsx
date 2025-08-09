import React, { useState, useEffect } from 'react';
import { SettingsHeader } from './SettingsHeader.jsx';
import { ConnectedStatus, DisconnectedStatus } from './ConnectionStatus.jsx';
import { MessageBox } from './MessageBox.jsx';
import { RepoSetupSection } from './RepoSetupSection.jsx';
import { SettingsSection } from './SettingsSection.jsx';
import { TemplateEditor } from './TemplateEditor.jsx';
import { RepoManagementSection } from './RepoManagementSection.jsx';
import { SettingsFooter } from './SettingsFooter.jsx';

/**
 * Settings 페이지 메인 앱 컴포넌트
 */
export const SettingsApp = ({
  // 연결 상태
  connected = false,
  repoName = '',

  // 메시지 (React 19 useActionState 통합)
  errorMessage = '',
  successMessage = '',
  isConnecting = false,

  // 저장소 설정
  repoType = '',
  repositories = [],

  // 설정값
  autoUpload = true,
  useCustomTemplate = false,
  templateString = '',
  templatePreview = '',

  // 이벤트 핸들러
  onRepoTypeChange,
  onRepoNameChange,
  onRepoSelectChange,
  onConnectRepo,
  onAutoUploadChange,
  onCustomTemplateChange,
  onTemplateChange,
  onTemplateInsert,
  onPresetSelect,
  onSaveTemplate,
  onResetTemplate,
  onUnlinkRepo,
  onHideMessage
}) => {
  return (
    <div className="container">
      <SettingsHeader />

      <div className="content">
        {/* 연결 상태 */}
        <div>
          {connected ? (
            <ConnectedStatus repoName={repoName} />
          ) : (
            <DisconnectedStatus />
          )}
        </div>

        {/* 메시지 */}
        <MessageBox 
          type="error" 
          message={errorMessage}
          visible={!!errorMessage}
        />
        <MessageBox 
          type="success" 
          message={successMessage}
          visible={!!successMessage}
        />

        {/* GitHub 저장소 설정 */}
        <RepoSetupSection 
          visible={!connected}
          repoType={repoType}
          repoName={repoName}
          repositories={repositories}
          onRepoTypeChange={onRepoTypeChange}
          onRepoNameChange={onRepoNameChange}
          onRepoSelectChange={onRepoSelectChange}
          onConnectRepo={onConnectRepo}
          connectDisabled={!repoType || (!repoName && repoType === 'new')}
          isConnecting={isConnecting}
        />

        {/* 기본 설정 */}
        <SettingsSection 
          visible={connected}
          autoUpload={autoUpload}
          useCustomTemplate={useCustomTemplate}
          onAutoUploadChange={onAutoUploadChange}
          onCustomTemplateChange={onCustomTemplateChange}
        />

        {/* 향상된 템플릿 설정 */}
        {useCustomTemplate && (
          <TemplateEditor 
            visible={connected && useCustomTemplate}
            templateString={templateString}
            templatePreview={templatePreview}
            onTemplateChange={onTemplateChange}
            onTemplateInsert={onTemplateInsert}
            onPresetSelect={onPresetSelect}
            onSaveTemplate={onSaveTemplate}
            onResetTemplate={onResetTemplate}
          />
        )}

        {/* 저장소 관리 */}
        <RepoManagementSection 
          visible={connected}
          onUnlinkRepo={onUnlinkRepo}
        />
      </div>

      <SettingsFooter />
    </div>
  );
};