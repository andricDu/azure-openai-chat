import React from "react";
import { Input, Button, Card } from "antd";
import { SendOutlined } from "@ant-design/icons";

const { TextArea } = Input;

const MessageInput = ({ 
  message, 
  setMessage, 
  sendMessage, 
  handleKeyPress, 
  loading, 
  streaming 
}) => (
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
        aria-label="Message input"
      />
      <Button
        type="primary"
        icon={<SendOutlined />}
        onClick={sendMessage}
        loading={loading}
        disabled={!message.trim()}
        aria-label="Send message"
      >
        Send
      </Button>
    </div>
  </Card>
);

export default MessageInput;