import { useState, useRef, useEffect, useContext } from "react";
import { Input, Button, Typography, Space, Card, Switch, message as notification } from "antd";
import { SendOutlined, ClearOutlined } from "@ant-design/icons";
import ReactMarkdown from "react-markdown";
import { AuthContext } from "./AuthProvider";

const { TextArea } = Input;
const { Text, Paragraph } = Typography;

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';

const Chat = () => {
    const [message, setMessage] = useState("");
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [streaming, setStreaming] = useState(true);
    const [currentStreamingMessage, setCurrentStreamingMessage] = useState("");
    const { token, authenticated } = useContext(AuthContext);
    const chatEndRef = useRef(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [history, currentStreamingMessage]);

    useEffect(() => {
        if (authenticated) {
            fetchChatHistory();
        }
    }, [authenticated]); // Only run when auth state changes

    const sendMessage = async () => {
        if (!authenticated) {
            alert("You must be logged in!");
            return;
        }

        if (!message.trim()) return;

        const userMessage = {
            role: "user",
            content: message,
            timestamp: new Date().toISOString(),
        };

        setHistory((prev) => [...prev, userMessage]);
        const currentMessage = message; // Store current message before clearing
        setMessage("");
        setLoading(true);

        if (streaming) {
            await sendStreamingMessage(currentMessage);
        } else {
            await sendRegularMessage(currentMessage);
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
            setHistory((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: "",
                    timestamp: new Date().toISOString(),
                    id: streamingMessageId,
                    streaming: true,
                },
            ]);

            let streamedContent = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    console.log('Stream ended');
                    setHistory((prev) =>
                        prev.map((msg) =>
                            msg.id === streamingMessageId
                                ? { ...msg, streaming: false }
                                : msg
                        )
                    );
                    break;
                }

                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;
                console.log('Raw chunk received:', chunk);

                // Split on "data: " to handle concatenated messages
                const parts = buffer.split('data: ');
                buffer = parts.pop() || ""; // Keep incomplete part in buffer

                for (let i = 1; i < parts.length; i++) { // Skip first empty part
                    const jsonStr = parts[i].trim();
                    
                    if (!jsonStr) continue;
                    
                    try {
                        console.log('Parsing JSON:', jsonStr);
                        const data = JSON.parse(jsonStr);
                        console.log('Parsed data:', data);

                        if (data.type === "content" && data.content) {
                            streamedContent += data.content;
                            console.log('Updated content:', streamedContent);

                            setHistory((prev) =>
                                prev.map((msg) =>
                                    msg.id === streamingMessageId
                                        ? { ...msg, content: streamedContent }
                                        : msg
                                )
                            );
                        } else if (data.type === "done") {
                            console.log('Stream completed via done signal');
                            setHistory((prev) =>
                                prev.map((msg) =>
                                    msg.id === streamingMessageId
                                        ? { ...msg, streaming: false }
                                        : msg
                                )
                            );
                            return;
                        } else if (data.type === "error") {
                            console.error('Stream error:', data.error);
                            notification.error(`Error: ${data.error}`);
                            setHistory((prev) =>
                                prev.filter((msg) => msg.id !== streamingMessageId)
                            );
                            return;
                        }
                    } catch (e) {
                        console.warn("Failed to parse SSE data:", jsonStr, e);
                    }
                }
            }
        } catch (error) {
            console.error("Streaming error:", error);
            notification.error("Failed to send message with streaming");
        } finally {
            setLoading(false);
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
            console.log('Response data:', data);

            const assistantMessage = {
                role: "assistant",
                content: data.response || data.content,
                timestamp: new Date().toISOString(),
            };

            setHistory((prev) => [...prev, assistantMessage]);
        } catch (error) {
            console.error("Error:", error);
            notification.error("Failed to send message");
        } finally {
            setLoading(false);
        }
    };

    const clearChat = () => {
        setHistory([]);
        setCurrentStreamingMessage("");
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const fetchChatHistory = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/chat`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            // Format the history data to match existing state structure
            const formattedHistory = data.map(msg => ({
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp || new Date().toISOString(),
                id: Date.now() + Math.random(),
                streaming: false
            }));
            
            setHistory(formattedHistory);
        } catch (error) {
            console.error("Error fetching chat history:", error);
            notification.error("Failed to load chat history");
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
            <Card style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                    <Text strong>AI Chat Assistant</Text>
                    <Space>
                        <Text>Streaming:</Text>
                        <Switch
                            checked={streaming}
                            onChange={setStreaming}
                            disabled={loading}
                        />
                        <Button
                            icon={<ClearOutlined />}
                            onClick={clearChat}
                            disabled={loading}
                        >
                            Clear
                        </Button>
                    </Space>
                </div>
            </Card>

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
            >
                {history.map((msg, index) => (
                    <div key={index} style={{ marginBottom: "16px" }}>
                        <Card
                            size="small"
                            style={{
                                backgroundColor: msg.role === "user" ? "#e6f7ff" : "#f6ffed",
                                border: `1px solid ${msg.role === "user" ? "#91d5ff" : "#b7eb8f"}`,
                            }}
                        >
                            <Space direction="vertical" style={{ width: "100%" }}>
                                <Text strong>
                                    {msg.role === "user" ? "👤 You" : "🤖 Assistant"}
                                    {msg.streaming && " (typing...)"}
                                </Text>
                                
                                {msg.role === "assistant" ? (
                                    <div style={{ margin: 0 }}>
                                        <ReactMarkdown
                                            components={{
                                                h1: ({ node, ...props }) => (
                                                    <Text {...props} style={{ fontSize: '20px', fontWeight: 'bold', display: 'block', marginBottom: '8px' }} />
                                                ),
                                                h2: ({ node, ...props }) => (
                                                    <Text {...props} style={{ fontSize: '18px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }} />
                                                ),
                                                h3: ({ node, ...props }) => (
                                                    <Text {...props} style={{ fontSize: '16px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }} />
                                                ),
                                                p: ({ node, ...props }) => (
                                                    <Paragraph {...props} style={{ margin: '8px 0' }} />
                                                ),
                                                ul: ({ node, ...props }) => (
                                                    <ul {...props} style={{ marginLeft: '16px', marginBottom: '8px' }} />
                                                ),
                                                ol: ({ node, ...props }) => (
                                                    <ol {...props} style={{ marginLeft: '16px', marginBottom: '8px' }} />
                                                ),
                                                li: ({ node, ...props }) => (
                                                    <li {...props} style={{ marginBottom: '4px' }} />
                                                ),
                                                code: ({ node, inline, ...props }) => (
                                                    inline ? (
                                                        <Text code {...props} style={{ backgroundColor: '#f5f5f5', padding: '2px 4px', borderRadius: '3px' }} />
                                                    ) : (
                                                        <pre style={{ 
                                                            backgroundColor: '#f5f5f5', 
                                                            padding: '12px', 
                                                            borderRadius: '6px', 
                                                            overflow: 'auto',
                                                            fontSize: '13px',
                                                            border: '1px solid #d9d9d9'
                                                        }}>
                                                            <code {...props} />
                                                        </pre>
                                                    )
                                                ),
                                                blockquote: ({ node, ...props }) => (
                                                    <div {...props} style={{ 
                                                        borderLeft: '4px solid #1890ff', 
                                                        paddingLeft: '12px', 
                                                        margin: '8px 0',
                                                        fontStyle: 'italic',
                                                        backgroundColor: '#f0f8ff'
                                                    }} />
                                                ),
                                                strong: ({ node, ...props }) => (
                                                    <Text strong {...props} />
                                                ),
                                                em: ({ node, ...props }) => (
                                                    <Text italic {...props} />
                                                ),
                                            }}
                                        >
                                            {msg.content}
                                        </ReactMarkdown>
                                        {msg.streaming && (
                                            <Text style={{ 
                                                color: '#1890ff', 
                                                fontWeight: 'bold',
                                                fontSize: '16px',
                                                marginLeft: '4px',
                                                animation: 'blink 1s infinite'
                                            }}>
                                                ▊
                                            </Text>
                                        )}
                                    </div>
                                ) : (
                                    <Paragraph style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                                        {msg.content}
                                    </Paragraph>
                                )}
                                
                                <Text type="secondary" style={{ fontSize: "12px" }}>
                                    {new Date(msg.timestamp).toLocaleTimeString()}
                                </Text>
                            </Space>
                        </Card>
                    </div>
                ))}
                <div ref={chatEndRef} />
            </div>

            <Card>
                <div style={{ display: "flex", gap: "8px" }}>
                    <TextArea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={`Type your message... (${streaming ? "Streaming" : "Regular"} mode)`}
                        autoSize={{ minRows: 1, maxRows: 4 }}
                        disabled={loading}
                        style={{ flex: 1 }}
                    />
                    <Button
                        type="primary"
                        icon={<SendOutlined />}
                        onClick={sendMessage}
                        loading={loading}
                        disabled={!message.trim()}
                    >
                        Send
                    </Button>
                </div>
            </Card>
        </div>
    );
};

export default Chat;
