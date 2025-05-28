import React, { useRef, useEffect, useContext, useReducer, useCallback } from "react";
import { Typography, Card, message as notification } from "antd";
import ReactMarkdown from "react-markdown";
import { AuthContext } from "./AuthProvider";
import { debounce } from "lodash";
import { chatReducer, initialState } from "./reducers/chatReducer";
import { useChatApi } from "./hooks/useChatApi";
import ChatHeader from "./components/ChatHeader";
import MessageInput from "./components/MessageInput";
import ChatMessage from './components/ChatMessage';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';

const Chat = () => {
    const [state, dispatch] = useReducer(chatReducer, initialState);
    const { token, authenticated } = useContext(AuthContext);
    const chatEndRef = useRef(null);
    const { fetchChatHistory } = useChatApi();

    const { 
        message, 
        history, 
        loading, 
        streaming, 
        currentStreamingMessage 
    } = state;

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [history, currentStreamingMessage]);

    useEffect(() => {
        if (authenticated) {
            loadChatHistory();
        }
    }, [authenticated]);

    const loadChatHistory = async () => {
        try {
            const historyData = await fetchChatHistory();
            dispatch({ type: 'SET_HISTORY', payload: historyData });
        } catch (error) {
            handleApiError(error, "Failed to load chat history");
        }
    };

    const handleApiError = (error, errorMessage) => {
        console.error(errorMessage, error);
        notification.error({
            message: "Error",
            description: errorMessage,
            duration: 4,
        });
    };

    const setMessage = useCallback(
        debounce((value) => {
            dispatch({ type: 'SET_MESSAGE', payload: value });
        }, 100),
        []
    );

    const setStreaming = (value) => {
        dispatch({ type: 'SET_STREAMING', payload: value });
    };

    const clearChat = async () => {
        try {
            // First, clear the UI
            dispatch({ type: 'CLEAR_CHAT' });
            
            // Then make API call to clear Redis cache
            if (authenticated && token) {
                const response = await fetch(`${API_BASE_URL}/chat/clear`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                notification.success({
                    message: "Chat cleared",
                    description: "Chat history has been cleared from the server.",
                    duration: 3,
                });
            }
        } catch (error) {
            handleApiError(error, "Failed to clear chat history from server");
            // Note: We don't revert the UI clear, as it's better to have UI/server mismatch
            // than to confuse the user by bringing back messages they wanted to clear
        }
    };

    const sendMessage = async () => {
        if (!authenticated) {
            notification.warning("You must be logged in!");
            return;
        }

        if (!message.trim()) return;

        const userMessage = {
            role: "user",
            content: message,
            timestamp: new Date().toISOString(),
            id: Date.now(),
        };

        dispatch({ type: 'ADD_USER_MESSAGE', payload: userMessage });
        dispatch({ type: 'SET_LOADING', payload: true });

        try {
            if (streaming) {
                await sendStreamingMessage(message);
            } else {
                await sendRegularMessage(message);
            }
        } catch (error) {
            handleApiError(error, "Failed to send message");
        }
    };

    const sendStreamingMessage = async (prompt) => {
        try {
            const response = await fetch(`${API_BASE_URL}/chat/stream`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    message: prompt
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            const streamingMessageId = Date.now();
            dispatch({ 
                type: 'ADD_ASSISTANT_MESSAGE', 
                payload: {
                    role: "assistant",
                    content: "",
                    timestamp: new Date().toISOString(),
                    id: streamingMessageId,
                    streaming: true,
                }
            });

            let streamedContent = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    dispatch({ 
                        type: 'SET_STREAMING_STATUS', 
                        payload: { id: streamingMessageId, streaming: false }
                    });
                    break;
                }

                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;

                // Split on "data: " to handle concatenated messages
                const parts = buffer.split('data: ');
                buffer = parts.pop() || ""; // Keep incomplete part in buffer

                for (let i = 1; i < parts.length; i++) { // Skip first empty part
                    const jsonStr = parts[i].trim();
                    
                    if (!jsonStr) continue;
                    
                    try {
                        const data = JSON.parse(jsonStr);

                        if (data.type === "content" && data.content) {
                            streamedContent += data.content;
                            
                            dispatch({ 
                                type: 'UPDATE_STREAMING_MESSAGE', 
                                payload: { id: streamingMessageId, content: streamedContent }
                            });
                        } else if (data.type === "done") {
                            dispatch({ 
                                type: 'SET_STREAMING_STATUS', 
                                payload: { id: streamingMessageId, streaming: false }
                            });
                            return;
                        } else if (data.type === "error") {
                            notification.error(`Error: ${data.error}`);
                            dispatch({ 
                                type: 'SET_HISTORY', 
                                payload: history.filter(msg => msg.id !== streamingMessageId)
                            });
                            return;
                        }
                    } catch (e) {
                        console.warn("Failed to parse SSE data:", jsonStr, e);
                    }
                }
            }
        } catch (error) {
            handleApiError(error, "Failed to send message with streaming");
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    };

    const sendRegularMessage = async (prompt) => {
        try {
            const response = await fetch(`${API_BASE_URL}/chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    message: prompt,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            const assistantMessage = {
                role: "assistant",
                content: data.response || data.content,
                timestamp: new Date().toISOString(),
                id: Date.now(),
                streaming: false
            };

            dispatch({ type: 'ADD_ASSISTANT_MESSAGE', payload: assistantMessage });
        } catch (error) {
            handleApiError(error, "Failed to send message");
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const handleRetry = (messageContent) => {
        // Set the message in the input field
        dispatch({ type: 'SET_MESSAGE', payload: messageContent });
        
        // Optional: Automatically send the message
        // If you want the user to review before sending, remove these lines
        const userMessage = {
            role: "user",
            content: messageContent,
            timestamp: new Date().toISOString(),
            id: Date.now(),
        };

        dispatch({ type: 'ADD_USER_MESSAGE', payload: userMessage });
        dispatch({ type: 'SET_LOADING', payload: true });

        try {
            if (streaming) {
                sendStreamingMessage(messageContent);
            } else {
                sendRegularMessage(messageContent);
            }
        } catch (error) {
            handleApiError(error, "Failed to send message");
        }
    };

    return (
        <div
            style={{
                height: "100vh",
                display: "flex",
                flexDirection: "column",
                maxWidth: "800px",
                margin: "0 auto",
                padding: "20px",
            }}
        >
            <ChatHeader 
                streaming={streaming} 
                setStreaming={setStreaming} 
                clearChat={clearChat} 
                loading={loading} 
            />

            <div
                style={{
                    flex: 1,
                    overflowY: "auto",
                    marginBottom: "20px",
                    padding: "20px",
                    border: "1px solid #d9d9d9",
                    borderRadius: "6px",
                    backgroundColor: "#fafafa",
                }}
                aria-live="polite"
                aria-label="Chat messages"
            >
                {history.map((msg, index) => (
                    <ChatMessage 
                        key={msg.id || index} 
                        message={msg} 
                        onRetry={handleRetry}
                    />
                ))}
                <div ref={chatEndRef} />
            </div>

            <MessageInput 
                message={message}
                setMessage={(value) => dispatch({ type: 'SET_MESSAGE', payload: value })}
                sendMessage={sendMessage}
                handleKeyPress={handleKeyPress}
                loading={loading}
                streaming={streaming}
            />
        </div>
    );
};

export default Chat;
