import React from "react";
import { Button, Typography, Space, Switch } from "antd";

const ChatHeader = ({ streaming, setStreaming, clearChat, loading, useEventSource, setUseEventSource }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
    <Typography.Title level={4}>AI Chat</Typography.Title>
    <Space>
      <span>Streaming:</span>
      <Switch
        checked={streaming}
        onChange={setStreaming}
        disabled={loading}
      />
      {streaming && (
        <>
          <span>Use EventSource:</span>
          <Switch
            checked={useEventSource}
            onChange={setUseEventSource}
            disabled={loading}
          />
        </>
      )}
      <Button
        onClick={clearChat}
        disabled={loading}
      >
        Clear Chat
      </Button>
    </Space>
  </div>
);

export default ChatHeader;