import React, { useState } from "react";
import axios from "axios";
import { Layout, Input, Button, Typography, Space, Spin } from "antd"; // Add Spin
import ReactMarkdown from "react-markdown";

const { Header, Content, Footer } = Layout;
const { TextArea } = Input;
const { Title } = Typography;

const welcomeMessage = () => {
    return "Welcome to the Help Chat! How can I assist you today?";
};

const Chat = () => {
    const [message, setMessage] = useState("");
    const [response, setResponse] = useState(welcomeMessage);
    const [loading, setLoading] = useState(false);

    const sendMessage = async () => {
        try {
            setLoading(true); // Start loading
            const res = await axios.post("/api/chat", { message });
            setResponse(res.data.response);
        } catch (error) {
            console.error("Error sending message:", error);
            setResponse("Error sending message");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout style={{ minHeight: "100vh" }}>
            <Header style={{ background: "#fff", padding: 0 }}>
                <div style={{ textAlign: "center" }}>
                    <Title level={2}>Help Chat</Title>
                </div>
            </Header>
            <Content style={{ padding: "0 50px", marginTop: 20 }}>
                <Space direction="vertical" style={{ width: "100%" }}>
                    <TextArea
                        rows={4}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type your message here"
                    />
                    <Button
                        type="primary"
                        onClick={sendMessage}
                        loading={loading}
                        block
                    >
                        Send
                    </Button>
                    <div className="markdown-content">
                        <Spin spinning={loading}>
                            <ReactMarkdown>{response}</ReactMarkdown>
                        </Spin>
                    </div>
                </Space>
            </Content>
            <Footer style={{ textAlign: "center" }}></Footer>
        </Layout>
    );
};

export default Chat;
