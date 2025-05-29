import { useState, useContext } from 'react';
import { notification } from 'antd';
import { AuthContext } from '../AuthProvider';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';

export function useChatApi() {
  const { token, authenticated } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleError = (error, message) => {
    console.error(message, error);
    setError(error.message || message);
    notification.error({
      message: "Error",
      description: error.message || message,
      duration: 4,
    });
    return error;
  };

  const fetchChatHistory = async () => {
    if (!authenticated || !token) {
      console.log("Not authenticated or missing token - skipping history fetch");
      return [];
    }
    
    setIsLoading(true);
    console.log("Fetching chat history from:", `${API_BASE_URL}/chat`);
    
    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      console.log("Chat history response status:", response.status);
      
      
      if (response.status === 403) {
        console.log("User is not a platform admin - cannot fetch chat history");
        return [];
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response body:", errorText);
        throw new Error(`Error fetching chat history: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log("Received chat history:", data);
      
      if (!Array.isArray(data)) {
        console.error("Expected array response but got:", typeof data);
        return [];
      }
      
      
      return data.map(msg => ({
        ...msg,
        id: msg.id || Date.now() + Math.random(),
        role: msg.role || "assistant", 
        content: msg.content || "",
        timestamp: msg.timestamp || new Date().toISOString()
      }));
    } catch (error) {
      console.error("Chat history fetch error:", error);
      handleError(error, "Failed to load chat history");
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const clearChatHistory = async () => {
    if (!authenticated || !token) return true;
    
    try {
      const response = await fetch(`${API_BASE_URL}/chat/clear`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to clear chat history: ${response.status}`);
      }
      
      notification.success({
        message: "Chat cleared",
        description: "Chat history has been cleared from the server.",
        duration: 3,
      });
      
      return true;
    } catch (error) {
      handleError(error, "Failed to clear chat history");
      return false;
    }
  };

  const sendMessage = async (messageText) => {
    if (!authenticated || !token) {
      notification.warning({ message: "You must be logged in!" });
      return null;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: messageText }),
      });

      if (!response.ok) {
        throw new Error(`Error sending message: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        role: data.success ? "assistant" : "system",
        content: data.content || (data.success ? "" : "An error occurred"),
        timestamp: data.timestamp || new Date().toISOString(),
        id: Date.now() + Math.random(),
        references: data.references,
        success: data.success
      };
    } catch (error) {
      handleError(error, "Failed to send message");
      return {
        role: "system",
        content: `Error: ${error.message}`,
        timestamp: new Date().toISOString(),
        id: Date.now() + Math.random(),
        success: false
      };
    } finally {
      setIsLoading(false);
    }
  };

  const streamMessage = async (messageText, onMessageStart, onContentChunk, onMessageComplete, onStreamError) => {
    if (!authenticated || !token) {
      notification.warning({ message: "You must be logged in!" });
      return false;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: messageText }),
      });

      if (!response.ok) {
        throw new Error(`Error streaming message: ${response.status}`);
      }

      
      const messageId = Date.now();
      
      
      if (onMessageStart) {
        onMessageStart({
          id: messageId,
          role: "assistant",
          content: "",
          timestamp: new Date().toISOString(),
          streaming: true,
        });
      }

      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let streamedContent = "";

      while (true) {
        const { done, value } = await reader.read();
        
        
        if (value) {
          console.log("Raw binary chunk size:", value.length);
        }
        
        if (done) {
          console.log("Stream done");
          if (onMessageComplete) {
            onMessageComplete(messageId, streamedContent);
          }
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        console.log("Decoded chunk:", chunk);
        buffer += chunk;

        
        if (buffer.includes('"type":"error"')) {
          console.log("Error message detected in buffer");
          
          try {
            
            const errorRegex = /data: (\{"type":"error".*\})/s;
            const match = buffer.match(errorRegex);
            
            if (match && match[1]) {
              const errorJson = match[1];
              console.log("Extracted error JSON:", errorJson);
              
              try {
                const errorData = JSON.parse(errorJson);
                console.log("Parsed error data:", errorData);
                
                
                
                let errorMessage = errorData.error;
                
                console.log("Final error message:", errorMessage);
                
                if (onStreamError) {
                  
                  onStreamError(messageId, errorMessage);
                }
                setIsLoading(false);
                return false;
              } catch (jsonErr) {
                console.error("Failed to parse error JSON:", jsonErr);
                
                if (onStreamError) {
                  onStreamError(messageId, errorJson);
                }
                setIsLoading(false);
                return false;
              }
            }
          } catch (regexErr) {
            console.error("Error while extracting error message:", regexErr);
          }
          
          
          if (onStreamError) {
            onStreamError(messageId, "Error occurred: " + buffer);
          }
          setIsLoading(false);
          return false;
        }

        
        const parts = buffer.split('data: ');
        buffer = parts.pop() || "";
        
        for (const part of parts) {
          if (!part.trim()) continue;
          
          try {
            console.log("Processing part:", part.trim());
            const data = JSON.parse(part.trim());
            console.log("Parsed data:", data);
            
            if (data.type === "content" && data.content) {
              streamedContent += data.content;
              if (onContentChunk) {
                onContentChunk(messageId, data.content, streamedContent);
              }
            } 
            else if (data.type === "done") {
              if (onMessageComplete) {
                onMessageComplete(messageId, streamedContent);
              }
              setIsLoading(false);
              return true;
            } 
            else if (data.type === "error") {
              console.log("Error data detected:", data);
              if (onStreamError) {
                onStreamError(messageId, data.error);
              }
              setIsLoading(false);
              return false;
            }
          } catch (e) {
            console.error("Error parsing SSE message:", e, part);
          }
        }
      }
      
      setIsLoading(false);
      return true;
    } catch (error) {
      handleError(error, "Failed to stream message");
      if (onStreamError) {
        onStreamError(null, error.message);
      }
      setIsLoading(false);
      return false;
    }
  };

  return {
    fetchChatHistory,
    clearChatHistory,
    sendMessage,
    streamMessage,
    isLoading,
    error
  };
};