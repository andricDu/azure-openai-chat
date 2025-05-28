import React, { useState } from 'react';
import { Card, Typography, Button, message as antMessage } from 'antd';
import { CopyOutlined, CheckOutlined, RetweetOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';
import '../styles/markdown.css';

const { Text, Paragraph } = Typography;

function unescapeMarkdown(text) {
  if (!text) return '';
  
  let result = text.replace(/\\n/g, '\n');
  
  // Preserve triple backticks for code blocks
  result = result.replace(/`{3,}([\s\S]*?)`{3,}/g, (match, content) => {
    return '\n```\n' + content.trim() + '\n```\n';
  });
  
  // IMPORTANT: Make sure we're not modifying inline code backticks
  // We should NOT replace single backticks at all - comment out any line that does this
  
  // Fix other escaped characters
  result = result
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, '\\');
    
  return result;
}

function normalizeMarkdown(text) {
  if (!text) return '';
  
  let result = text;
  
  // Fix list items that don't have proper spacing - IMPROVED VERSION
  // This ensures list numbers stay on the same line as content
  result = result.replace(/(\d+)\.\s*\n+\s*(\S)/g, '$1. $2');
  
  // Fix code blocks with improper spacing
  result = result.replace(/```(\w*)\s*\n?/g, '```$1\n');
  result = result.replace(/\n?```/g, '\n```');
  
  // Fix bullet points
  result = result.replace(/•\s*/g, '* ');
  
  // Ensure paragraphs have proper spacing
  result = result.replace(/\n{3,}/g, '\n\n');
  
  // Remove unwanted Unicode characters
  result = result.replace(/[\u2028\u2029]/g, '\n');
  
  return result;
}

const ChatMessage = ({ message, onRetry }) => {
  const { role, content, streaming, timestamp, id } = message;
  const [copiedCode, setCopiedCode] = useState(null);
  
  // Custom renderer for code blocks
  const components = {
    code({ node, inline, className, children, ...props }) {
      const codeString = String(children).replace(/\n$/, '');
      
      // This is critical - handle inline code differently
      if (inline) {
        return (
          <code className={className ? className : "inline-code"} {...props}>
            {children}
          </code>
        );
      }
      
      // Only for code blocks (not inline)
      const language = /language-(\w+)/.exec(className || '');
      
      const handleCopy = () => {
        navigator.clipboard.writeText(codeString)
          .then(() => {
            setCopiedCode(codeString);
            antMessage.success('Code copied to clipboard!');
            setTimeout(() => setCopiedCode(null), 2000);
          })
          .catch(err => {
            console.error('Failed to copy code: ', err);
            antMessage.error('Failed to copy code');
          });
      };
      
      return (
        <div className="code-block-wrapper">
          <div className="code-header">
            {language && <span className="code-language">{language[1]}</span>}
            <Button 
              className="copy-button"
              icon={copiedCode === codeString ? <CheckOutlined /> : <CopyOutlined />}
              size="small"
              type="text"
              onClick={handleCopy}
              title="Copy code"
            >
              {copiedCode === codeString ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          <pre className={className} {...props}>
            <code className={language ? `language-${language[1]}` : ''}>
              {children}
            </code>
          </pre>
        </div>
      );
    }
  };
  
  // Debugging: Log the original and unescaped content
  console.log('Original content:', content);
  console.log('Unescaped content:', unescapeMarkdown(content));
  console.log('Raw content:', content);
  console.log('Processed content:', unescapeMarkdown(normalizeMarkdown(content)));
  
  const handleRetry = () => {
    if (onRetry) {
      onRetry(content);
    }
  };
  
  return (
    <div style={{ marginBottom: "16px" }}>
      <Card
        size="small"
        className={role === "user" ? "user-message" : "assistant-message"}
        style={{
          backgroundColor: role === "user" ? "#e6f7ff" : "#f6ffed",
          border: `1px solid ${role === "user" ? "#91d5ff" : "#b7eb8f"}`,
          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
        }}
      >
        <div style={{ width: "100%" }}>
          <Text strong>
            {role === "user" ? "👤 You" : "🤖 Assistant"}
            {streaming && " (typing...)"}
          </Text>
          
          {role === "assistant" ? (
            <div className="message-content">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]} 
                rehypePlugins={[rehypeHighlight]}
                className="markdown-content"
                components={components}
              >
                {unescapeMarkdown(normalizeMarkdown(content))}
              </ReactMarkdown>
              {streaming && (
                <span className="streaming-cursor">▊</span>
              )}
            </div>
          ) : (
            <Paragraph style={{ margin: 0, whiteSpace: "pre-wrap" }}>
              {content}
            </Paragraph>
          )}
          
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            marginTop: "8px" 
          }}>
            <Text type="secondary" style={{ fontSize: "12px" }}>
              {new Date(timestamp).toLocaleTimeString()}
            </Text>
            
            {/* Add retry button for user messages only */}
            {role === "user" && (
              <Button 
                type="text" 
                size="small"
                icon={<RetweetOutlined />} 
                onClick={handleRetry}
                title="Retry this message"
              >
                Retry
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ChatMessage;