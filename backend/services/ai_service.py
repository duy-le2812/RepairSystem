"""
ai_service.py — FixCare AI Chatbot Service (OpenRouter)
========================================================
Sử dụng OpenRouter API thông qua OpenAI-compatible SDK.
Hỗ trợ switching provider chỉ bằng thay đổi biến môi trường AI_PROVIDER.

Cấu hình .env cần có:
    AI_PROVIDER=openrouter
    OPENROUTER_API_KEY=<key>
    OPENROUTER_MODEL=deepseek/deepseek-chat-v3-0324:free
"""

import os
import time
import logging
from typing import List, Optional
from openai import OpenAI, APIStatusError, APIConnectionError, APITimeoutError

# ==========================================
# LOGGING — Không log API Key, không log Header
# ==========================================
logger = logging.getLogger("ai_service")

# ==========================================
# SYSTEM PROMPT — Nhân cách của AI FixCare
# ==========================================
SYSTEM_PROMPT = """Bạn là nhân viên kỹ thuật của cửa hàng sửa chữa thiết bị điện tử RepairSystem.

Nhiệm vụ của bạn:
- Tư vấn lỗi và giải thích nguyên nhân một cách rõ ràng, dễ hiểu
- Đưa ra chẩn đoán sơ bộ (hardware hay software)
- KHÔNG bịa giá hoặc cam kết giá cụ thể khi chưa kiểm tra máy thực tế
- KHÔNG bịa thông tin bảo hành hoặc chính sách
- Nếu không chắc, hãy yêu cầu khách mang máy tới cửa hàng kiểm tra MIỄN PHÍ
- Trả lời bằng tiếng Việt, thân thiện và chuyên nghiệp

Giới hạn: Giữ câu trả lời ngắn gọn (dưới 150 từ), không vượt quá 2-3 đoạn."""


class AIService:
    """
    Dịch vụ AI tập trung — chịu trách nhiệm gọi AI provider.

    Hỗ trợ providers (cấu hình qua AI_PROVIDER trong .env):
        - openrouter (mặc định): dùng OpenRouter API với OpenAI SDK
        - openai: dùng trực tiếp OpenAI API
        - (mở rộng thêm sau: gemini, ollama, ...)

    main.py chỉ gọi: AIService.chat(message, history)
    """

    @staticmethod
    def _get_openrouter_client() -> OpenAI:
        """Khởi tạo OpenAI-compatible client trỏ tới OpenRouter."""
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            raise ValueError("OPENROUTER_API_KEY chưa được cấu hình trong .env")
        return OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key,
        )

    @staticmethod
    def _get_openai_client() -> OpenAI:
        """Khởi tạo client OpenAI thuần."""
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY chưa được cấu hình trong .env")
        return OpenAI(api_key=api_key)

    @staticmethod
    def _build_client() -> tuple[OpenAI, str]:
        """
        Chọn provider dựa theo AI_PROVIDER trong .env.
        Trả về (client, model_name).
        """
        provider = os.getenv("AI_PROVIDER", "openrouter").lower()

        if provider == "openrouter":
            client = AIService._get_openrouter_client()
            model = os.getenv("OPENROUTER_MODEL", "deepseek/deepseek-chat-v3-0324:free")
        elif provider == "openai":
            client = AIService._get_openai_client()
            model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        else:
            raise ValueError(f"AI_PROVIDER không hợp lệ: '{provider}'. Chọn: openrouter, openai")

        return client, model

    @staticmethod
    def chat(
        message: str,
        history: Optional[List[dict]] = None,
    ) -> str:
        """
        Gửi message (và lịch sử chat) tới AI provider, trả về text response.

        Args:
            message:  Tin nhắn hiện tại của người dùng.
            history:  Danh sách các message trước đó theo chuẩn OpenAI:
                      [{"role": "user"|"assistant", "content": "..."}]

        Returns:
            Chuỗi phản hồi từ AI.

        Raises:
            ValueError: Nếu message rỗng hoặc cấu hình thiếu.
            RuntimeError: Nếu AI provider không phản hồi được (đã log chi tiết).
        """
        if not message or not message.strip():
            raise ValueError("Message không được để trống!")

        client, model = AIService._build_client()

        # Xây dựng messages array theo chuẩn OpenAI
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]

        if history:
            for entry in history:
                role = entry.get("role", "user")
                content = entry.get("content", "")
                if role in ("user", "assistant") and content:
                    messages.append({"role": role, "content": content})

        messages.append({"role": "user", "content": message.strip()})

        start_time = time.time()

        try:
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=400,
                temperature=0.7,
            )

            latency_ms = int((time.time() - start_time) * 1000)
            logger.info(
                "[AIService] provider=%s model=%s status=200 latency=%dms",
                os.getenv("AI_PROVIDER", "openrouter"),
                model,
                latency_ms,
            )

            ai_text = response.choices[0].message.content
            if not ai_text or not ai_text.strip():
                raise RuntimeError("AI trả về phản hồi rỗng.")

            return ai_text.strip()

        except APIStatusError as e:
            latency_ms = int((time.time() - start_time) * 1000)
            logger.error(
                "[AIService] model=%s status=%d latency=%dms error=%s",
                model, e.status_code, latency_ms, e.message,
            )
            if e.status_code == 401:
                raise RuntimeError("API Key không hợp lệ hoặc hết hạn.")
            elif e.status_code == 429:
                raise RuntimeError("AI đang quá tải, vui lòng thử lại sau ít phút.")
            elif e.status_code == 404:
                raise RuntimeError(f"Model '{model}' không tồn tại hoặc chưa được hỗ trợ.")
            else:
                raise RuntimeError(f"AI service lỗi HTTP {e.status_code}.")

        except APIConnectionError as e:
            latency_ms = int((time.time() - start_time) * 1000)
            logger.error("[AIService] model=%s connection_error latency=%dms: %s", model, latency_ms, str(e))
            raise RuntimeError("Không thể kết nối tới AI service.")

        except APITimeoutError as e:
            latency_ms = int((time.time() - start_time) * 1000)
            logger.error("[AIService] model=%s timeout latency=%dms: %s", model, latency_ms, str(e))
            raise RuntimeError("AI phản hồi quá chậm, vui lòng thử lại.")

        except RuntimeError:
            raise

        except Exception as e:
            latency_ms = int((time.time() - start_time) * 1000)
            logger.error(
                "[AIService] model=%s unexpected_error=%s latency=%dms: %s",
                model, type(e).__name__, latency_ms, str(e),
            )
            raise RuntimeError("Lỗi không xác định từ AI service.")
