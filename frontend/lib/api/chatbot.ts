import { BASE_URL, fetchWithAuth } from './client';
import { handleUnauthorized } from './auth';

/**
 * Send chat message to Backend AI Chatbot
 * Backend handles OpenAI integration
 */
export async function sendChatMessage(message: string): Promise<string> {
  if (!message || !message.trim()) {
    throw new Error('Message không được để trống!');
  }

  try {
    const response = await fetchWithAuth(`${BASE_URL}/api/chat/`, {
      method: 'POST',
      body: JSON.stringify({
        message: message.trim(),
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorized();
      }
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json();
    return data.ai_response || 'Xin lỗi, không nhận được phản hồi từ AI.';
  } catch (error) {
    console.error('Chat API error:', error);
    
    // Fallback response if Backend is unavailable
    const fallbackResponse = 'Em xin lỗi, hiện tại không thể kết nối tới hệ thống AI. Vui lòng thử lại sau hoặc liên hệ Hotline 1800 2056 để được hỗ trợ trực tiếp nhé!';
    return fallbackResponse;
  }
}
