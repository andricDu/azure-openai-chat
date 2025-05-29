import React from "react";
import { Button, Typography, Space, Card, Switch } from "antd";
import { ClearOutlined } from "@ant-design/icons";

const { Text } = Typography;

const ChatHeader = ({ streaming, setStreaming, clearChat, loading }) => (
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
);

export default ChatHeader;