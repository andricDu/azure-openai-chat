import React, { useState } from 'react';
import { Card, Typography, Button, message as antMessage } from 'antd';
import { CopyOutlined, CheckOutlined, RetweetOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';
import '../styles/markdown.css';

const { Text, Paragraph } = Typography;


function formatMarkdown(text) {
  if (!text) return '';
  
  
  let result = text;
  
  
  result = result.replace(/(\d+)\.\s*\n+\s*(\S)/g, '$1. $2');
  
  
  result = result.replace(/```(\w*)\s*\n?/g, '```$1\n');
  result = result.replace(/\n?```/g, '\n```');
  
  
  result = result.replace(/•\s*/g, '* ');
  
  
  result = result.replace(/\n{3,}/g, '\n\n');
  
  return result;
}

const ChatMessage = ({ message, onRetry }) => {
  const { role, content, streaming, timestamp, references } = message;
  const [copiedCode, setCopiedCode] = useState(null);
  
  
  const components = {
    code({ node, inline, className, children, ...props }) {
      const codeString = String(children).replace(/\n$/, '');
      
      
      if (inline) {
        return (
          <code className={className ? className : "inline-code"} {...props}>
            {children}
          </code>
        );
      }
      
      
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
  
  
  const backgroundColor = role === "user" ? "#e6f7ff" : 
                         role === "system" ? "#fff1f0" : "#f6ffed";
  
  const borderColor = role === "user" ? "#91d5ff" : 
                     role === "system" ? "#ffa39e" : "#b7eb8f";
  
  const handleRetry = () => {
    if (onRetry) {
      onRetry(content);
    }
  };
  
  
  const displayContent = typeof content === 'object' ? 
    JSON.stringify(content, null, 2) : content;
  
  
  const renderContent = () => {
    if (role === "system" && content.startsWith("Error:")) {
      return (
        <pre style={{ 
          whiteSpace: "pre-wrap", 
          overflow: "auto",
          maxHeight: "300px",
          backgroundColor: "#fff1f0",
          padding: "8px",
          borderRadius: "4px",
          fontSize: "0.9em"
        }}>
          {content}
        </pre>
      );
    }
    
    
    return (
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]} 
        rehypePlugins={[rehypeHighlight]}
        className="markdown-content"
        components={components}
      >
        {formatMarkdown(content)}
      </ReactMarkdown>
    );
  };
  
  return (
    <div style={{ marginBottom: "16px" }}>
      <Card
        size="small"
        style={{
          backgroundColor,
          border: `1px solid ${borderColor}`,
          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
        }}
      >
        <div style={{ width: "100%" }}>
          <Text strong>
            {role === "user" ? "👤 You" : role === "system" ? "🚫 System" : "🤖 Assistant"}
            {streaming && " (typing...)"}
          </Text>
          
          {role === "assistant" ? (
            <div className="message-content">
              {renderContent()}
              {streaming && (
                <span className="streaming-cursor">▊</span>
              )}
            </div>
          ) : (
            <Paragraph style={{ margin: 0, whiteSpace: "pre-wrap" }}>
              {displayContent}
            </Paragraph>
          )}
          
          {/* References section if available */}
          {references && references.length > 0 && (
            <div style={{ marginTop: "10px", borderTop: "1px solid #f0f0f0", paddingTop: "10px" }}>
              <Text strong>References:</Text>
              <ul style={{ paddingLeft: "20px", margin: "5px 0" }}>
                {references.map((ref, index) => (
                  <li key={index}>{ref}</li>
                ))}
              </ul>
            </div>
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
            
            {/* Retry button for user messages only */}
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