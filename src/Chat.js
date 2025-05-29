import React, { useRef, useEffect, useState, useContext } from "react";
import { AuthContext } from "./AuthProvider";
import { useChatApi } from "./hooks/useChatApi";
import ChatHeader from "./components/ChatHeader";
import MessageInput from "./components/MessageInput";
import ChatMessage from './components/ChatMessage';

const Chat = () => {
    const [message, setMessage] = useState("");
    const [history, setHistory] = useState([]);
    const [streaming, setStreaming] = useState(true);
    const { authenticated } = useContext(AuthContext);
    
    const chatEndRef = useRef(null);
    const { 
        fetchChatHistory, 
        clearChatHistory, 
        sendMessage, 
        streamMessage, 
        isLoading 
    } = useChatApi();

    
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [history]);

    
    useEffect(() => {
        loadChatHistory();
    }, []);

    
    useEffect(() => {
        if (authenticated) {
            loadChatHistory();
        }
    }, [authenticated]); 

    const loadChatHistory = async () => {
        const historyData = await fetchChatHistory();
        console.log("History data received in component:", historyData);
        
        if (historyData && Array.isArray(historyData)) {
            setHistory(historyData);
        } else {
            console.error("Invalid history data format:", historyData);
        }
    };

    const clearChat = async () => {
        setHistory([]);
        await clearChatHistory();
    };

    const handleSendMessage = async () => {
        if (!message.trim()) return;

        
        const userMessage = {
            role: "user",
            content: message,
            timestamp: new Date().toISOString(),
            id: Date.now(),
        };
        setHistory(prev => [...prev, userMessage]);
        
        
        const currentMessage = message;
        setMessage("");

        if (streaming) {
            
            streamMessage(
                currentMessage,
                
                (initialMessage) => {
                    setHistory(prev => [...prev, initialMessage]);
                },
                
                (msgId, chunk, fullContent) => {
                    setHistory(prev => 
                        prev.map(msg => 
                            msg.id === msgId 
                                ? { ...msg, content: fullContent } 
                                : msg
                        )
                    );
                },
                
                (msgId, finalContent) => {
                    setHistory(prev => 
                        prev.map(msg => 
                            msg.id === msgId 
                                ? { ...msg, streaming: false } 
                                : msg
                        )
                    );
                },
                
                (msgId, errorMessage) => {
                    if (msgId) {
                        
                        setHistory(prev => prev.filter(msg => msg.id !== msgId));
                    }
                    
                    
                    const errorContent = typeof errorMessage === 'object'
                        ? JSON.stringify(errorMessage, null, 2)
                        : String(errorMessage);
                    
                    const errorMsg = {
                        role: "system",
                        content: `Error: ${errorContent}`,
                        timestamp: new Date().toISOString(),
                        id: Date.now()
                    };
                    setHistory(prev => [...prev, errorMsg]);
                }
            );
        } else {
            
            const response = await sendMessage(currentMessage);
            if (response) {
                setHistory(prev => [...prev, response]);
            }
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleRetry = (messageContent) => {
        setMessage(messageContent);
        
        
        const userMessage = {
            role: "user",
            content: messageContent,
            timestamp: new Date().toISOString(),
            id: Date.now(),
        };

        setHistory(prev => [...prev, userMessage]);
        
        if (streaming) {
            streamMessage(
                messageContent,
                (initialMessage) => setHistory(prev => [...prev, initialMessage]),
                (msgId, chunk, fullContent) => {
                    setHistory(prev => 
                        prev.map(msg => 
                            msg.id === msgId ? { ...msg, content: fullContent } : msg
                        )
                    );
                },
                (msgId) => {
                    setHistory(prev => 
                        prev.map(msg => 
                            msg.id === msgId ? { ...msg, streaming: false } : msg
                        )
                    );
                },
                (msgId, errorMessage) => {
                    if (msgId) {
                        setHistory(prev => prev.filter(msg => msg.id !== msgId));
                    }
                    
                    const errorMsg = {
                        role: "system",
                        content: `Error: ${errorMessage}`,
                        timestamp: new Date().toISOString(),
                        id: Date.now()
                    };
                    setHistory(prev => [...prev, errorMsg]);
                }
            );
        } else {
            sendMessage(messageContent).then(response => {
                if (response) {
                    setHistory(prev => [...prev, response]);
                }
            });
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
                loading={isLoading} 
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
                {history.map((msg) => (
                    <ChatMessage 
                        key={msg.id} 
                        message={msg} 
                        onRetry={handleRetry}
                    />
                ))}
                <div ref={chatEndRef} />
            </div>

            <MessageInput 
                message={message}
                setMessage={setMessage}
                sendMessage={handleSendMessage}
                handleKeyPress={handleKeyPress}
                loading={isLoading}
                streaming={streaming}
            />
        </div>
    );
};

export default Chat;
