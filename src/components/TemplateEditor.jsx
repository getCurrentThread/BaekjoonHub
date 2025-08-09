import React from 'react';

/**
 * 템플릿 편집기 컴포넌트
 */
export const TemplateEditor = ({ 
  visible = false,
  templateString,
  templatePreview,
  onTemplateChange,
  onTemplateInsert,
  onPresetSelect,
  onSaveTemplate,
  onResetTemplate
}) => {
  if (!visible) return null;

  const presets = [
    {
      template: "{{platform}}/{{language}}/{{removeAfterSpace(level)}}/{{problemId}}. {{safe(title)}}",
      title: "기본형 (복합)",
      example: "백준/Python/Silver/1000. A＋B"
    },
    {
      template: "{{removeAfterSpace(level)}}/{{language}}/{{problemId}}-{{safe(title)}}",
      title: "난이도별 + 언어별",
      example: "Bronze/Python/1000-A+B"
    },
    {
      template: "{{platform}}/{{problemId}}/{{safe(title)}}",
      title: "플랫폼별 + 문제별",
      example: "백준/1000/A+B"
    },
    {
      template: "{{language}}/{{problemId}}-{{safe(title)}}",
      title: "언어별 단순 구조",
      example: "Python/1000-A+B"
    }
  ];

  const variables = [
    { name: "platform", tooltip: "문제를 푼 플랫폼 이름 (예: 백준, 프로그래머스)" },
    { name: "problemId", tooltip: "문제 번호 또는 ID (예: 1000, 42586)" },
    { name: "title", tooltip: "문제 제목 (예: A+B, 괄호 변환)" },
    { name: "level", tooltip: "문제 난이도 (예: Bronze V, Silver III)" },
    { name: "language", tooltip: "사용한 프로그래밍 언어 (예: Python, Java)" }
  ];

  const filters = [
    { name: "safe", tooltip: "파일명에 안전한 문자로 변환 (특수문자 → 전각)" },
    { name: "urlSafe", tooltip: "URL에 안전한 문자로 변환" },
    { name: "removeAfterSpace", tooltip: "첫 번째 공백 이후 문자 제거 (Silver V → Silver)" },
    { name: "trim", tooltip: "앞뒤 공백 제거" },
    { name: "extractNumbers", tooltip: "숫자만 추출 (abc123def → 123)" },
    { name: "extractLetters", tooltip: "영문자만 추출 (abc123def → abcdef)" },
    { name: "truncate", tooltip: "문자열 길이 제한 (기본 50자)" },
    { name: "htmlEscape", tooltip: 'HTML 특수문자 이스케이프 (&lt;&gt;&amp;")' },
    { name: "base64Encode", tooltip: "Base64로 인코딩" }
  ];

  return (
    <div>
      <div className="card">
        <h3 style={{ marginBottom: '20px', color: '#2d3748', fontSize: '18px' }}>📁 템플릿 패턴 설정</h3>

        <div className="tutorial-tip">
          <span className="tip-icon">✨</span>
          아래 변수 버튼을 클릭하여 원하는 폴더 구조를 만들어보세요! 필터 함수를 사용하여 텍스트를 변환할 수 있습니다.
        </div>

        {/* 미리 설정된 템플릿 */}
        <div className="form-group">
          <label className="form-label">자주 사용하는 템플릿</label>
          <div className="template-presets">
            {presets.map((preset, index) => (
              <div 
                key={index}
                className="preset-card" 
                onClick={() => onPresetSelect(preset.template)}
                style={{ cursor: 'pointer' }}
              >
                <div className="preset-title">{preset.title}</div>
                <div className="preset-example">{preset.example}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 변수 버튼들 */}
        <div className="form-group">
          <label className="form-label">사용 가능한 변수</label>
          <div className="template-variables">
            {variables.map((variable) => (
              <button 
                key={variable.name}
                type="button" 
                className="variable-btn" 
                title={variable.tooltip}
                onClick={() => onTemplateInsert(`{{${variable.name}}}`)}
              >
                {variable.name}
              </button>
            ))}
          </div>
          <div className="help-text">변수를 클릭하여 템플릿에 추가하세요. 함수와 함께 사용할 수 있습니다: {`{{safe(title)}}`}</div>
        </div>

        {/* 필터 함수 버튼들 */}
        <div className="form-group">
          <label className="form-label">텍스트 변환 함수</label>
          <div className="filter-buttons">
            {filters.map((filter) => (
              <button 
                key={filter.name}
                type="button" 
                className="filter-btn" 
                title={filter.tooltip}
                onClick={() => onTemplateInsert(`${filter.name}()`)}
              >
                {filter.name}()
              </button>
            ))}
          </div>
          <div className="help-text">
            함수를 클릭하면 커서 위치에 함수가 추가됩니다. 변수를 함수로 감쌀 수 있습니다.
            <br /><strong>예시:</strong> safe(파일명 안전문자), removeAfterSpace(공백 이후 제거), urlSafe(URL 안전문자)
          </div>
        </div>

        {/* 템플릿 입력 */}
        <div className="form-group">
          <label className="form-label" htmlFor="templateString">템플릿 패턴</label>
          <input 
            type="text" 
            id="templateString" 
            className="form-control" 
            placeholder="변수 및 함수 버튼을 클릭하여 템플릿을 구성하세요"
            value={templateString}
            onChange={onTemplateChange}
          />
          <div className="help-text">
            슬래시(/)로 폴더를 구분합니다. 파일 확장자는 자동으로 추가됩니다.
            <br /><strong>예시:</strong> {`{{language}}/{{safe(title)}} 또는 {{removeAfterSpace(level)}}/{{problemId}}`}
          </div>
        </div>

        {/* 실시간 미리보기 */}
        <div className="template-preview">
          <div className="preview-label">🎯 미리보기:</div>
          <div className="preview-result">{templatePreview}</div>
        </div>

        {/* 템플릿 저장 버튼 */}
        <div className="button-group" style={{ marginTop: '20px' }}>
          <button className="button button-primary" onClick={onSaveTemplate}>
            <span>💾</span> 템플릿 저장
          </button>
          <button className="button button-secondary" onClick={onResetTemplate}>
            <span>🔄</span> 초기화
          </button>
        </div>
      </div>
    </div>
  );
};