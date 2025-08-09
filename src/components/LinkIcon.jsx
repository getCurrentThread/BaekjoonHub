/**
 * Link Icon Component - React version
 * Reusable SVG icon component for external links
 */

/**
 * External Link Icon Component
 * @param {object} props - Component properties
 * @param {number} props.width - Icon width (default: 16)
 * @param {number} props.height - Icon height (default: 16)
 * @param {string} props.style - Additional CSS styles
 * @returns {JSX.Element} SVG link icon
 */
export const LinkIcon = ({ 
  width = 16, 
  height = 16, 
  style = "margin-left: 8px; opacity: 0.8;" 
}) => (
  <svg 
    width={width} 
    height={height} 
    viewBox="0 0 16 16" 
    fill="currentColor" 
    style={style}
  >
    <path d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z"/>
    <path d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z"/>
  </svg>
);

/**
 * Link Icon Container Component
 * Complete component with icon and styling for toast integration
 * @returns {JSX.Element} Styled link icon container
 */
export const LinkIconContainer = () => (
  <div style={{ display: "inline-block", verticalAlign: "middle" }}>
    <LinkIcon />
  </div>
);