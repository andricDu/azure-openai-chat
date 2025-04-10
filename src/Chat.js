import React, { useState, useContext, useEffect, useRef } from "react";
import axios from "axios";
import { Layout, Input, Button, Typography, Space } from "antd";
import ReactMarkdown from "react-markdown";
import { AuthContext } from "./AuthProvider";

const { Header, Content, Footer } = Layout;
const { TextArea } = Input;
const { Title } = Typography;

const Chat = () => {
    const [message, setMessage] = useState("");
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const { token, authenticated } = useContext(AuthContext);
    const chatEndRef = useRef(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [history]);

    const sendMessage = async () => {
        if (!authenticated) {
            alert("You must be logged in!");
            return;
        }

        try {
            setLoading(true);
            const res = await axios.post(
                "http://0.0.0.0:5071/v1/chat",
                { message },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                }
            );

            setHistory([...history, { role: "user", content: message }, { role: "bot", content: res.data.response }]);
            setMessage("");
        } catch (error) {
            console.error("Error sending message:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
            <Header style={{ background: "#fff", padding: 0 }}>
                <div style={{ textAlign: "center" }}>
                    <Title level={2}>Pilot Help Chatbot</Title>
                </div>
            </Header>
            <Content style={{ flexGrow: 1, padding: "0 50px", display: "flex", flexDirection: "column" }}>
                <div
                    style={{
                        flexGrow: 1,
                        display: "flex",
                        flexDirection: "column-reverse",
                        overflowY: "auto",
                        border: "1px solid #ccc",
                        padding: "10px",
                        borderRadius: "8px",
                        background: "#f9f9f9",
                    }}
                >
                    {history
                        .slice()
                        .reverse()
                        .map((msg, index) => (
                            <div
                                key={index}
                                style={{
                                    display: "flex",
                                    justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                                    marginBottom: "8px",
                                }}
                            >
                                <div
                                    style={{
                                        maxWidth: "60%",
                                        padding: "10px 15px",
                                        borderRadius: "15px",
                                        backgroundColor: msg.role === "user" ? "#007bff" : "#EAEAEA",
                                        color: msg.role === "user" ? "#fff" : "#000",
                                        wordWrap: "break-word",
                                    }}
                                >
                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                </div>
                            </div>
                        ))}
                    <div ref={chatEndRef} />
                </div>
                <Space direction="vertical" style={{ width: "100%", marginTop: "10px" }}>
                    <TextArea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type your message here" />
                    <Button type="primary" onClick={sendMessage} loading={loading} block>
                        Send
                    </Button>
                </Space>
            </Content>
            <Footer style={{ textAlign: "center" }}></Footer>
        </Layout>
    );
};

export default Chat;
