import { useContext } from 'react';
import { AuthContext } from '../AuthProvider';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';

export function useChatApi() {
  const { token } = useContext(AuthContext);
  
  const fetchChatHistory = async () => {
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
    
    return data.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp || new Date().toISOString(),
      id: Date.now() + Math.random(),
      streaming: false
    }));
  };
  
  const sendRegularMessage = async (prompt) => {
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
    return {
      role: "assistant",
      content: data.response || data.content,
      timestamp: new Date().toISOString(),
    };
  };
  
  return { fetchChatHistory, sendRegularMessage };
}