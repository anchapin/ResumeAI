"""
Streaming Response Handler

Server-Sent Events (SSE) for streaming completions.
"""

import asyncio
import json
import logging
from typing import AsyncGenerator

logger = logging.getLogger(__name__)


class StreamingHandler:
    """
    Handle streaming responses for completions.

    Uses Server-Sent Events (SSE) for real-time streaming.

    Example:
        handler = StreamingHandler(llm_client)
        async for chunk in handler.stream_completion(prompt):
            yield chunk
    """

    def __init__(self, llm_client=None):
        """
        Initialize StreamingHandler.

        Args:
            llm_client: LLM client for streaming
        """
        self.llm_client = llm_client

    async def stream_completion(
        self,
        prompt: str,
        completion_id: str,
        max_tokens: int = 500,
    ) -> AsyncGenerator[str, None]:
        """
        Stream completion chunks.

        Args:
            prompt: Prompt for completion
            completion_id: Unique completion ID
            max_tokens: Maximum tokens to generate

        Yields:
            SSE-formatted chunks
        """
        if not self.llm_client or not hasattr(self.llm_client, "stream"):
            # Fallback: send as single chunk
            yield self._format_sse("start", {"id": completion_id})
            yield self._format_sse("chunk", {"text": "Completion text"})
            yield self._format_sse("end", {"id": completion_id})
            return

        try:
            yield self._format_sse("start", {"id": completion_id})

            async for chunk in self.llm_client.stream(
                prompt, max_tokens=max_tokens
            ):
                yield self._format_sse("chunk", {"text": chunk})
                await asyncio.sleep(0)  # Yield control

            yield self._format_sse("end", {"id": completion_id})

        except Exception as e:
            logger.error(f"Streaming error: {e}")
            yield self._format_sse("error", {"message": str(e)})

    async def stream_bullet_completions(
        self,
        section_type: str,
        role: str | None,
        completion_id: str,
    ) -> AsyncGenerator[str, None]:
        """
        Stream bullet point completions.

        Args:
            section_type: Type of section
            role: Job role
            completion_id: Unique completion ID

        Yields:
            SSE-formatted chunks
        """
        if not self.llm_client or not hasattr(self.llm_client, "stream"):
            # Fallback
            bullets = self._get_template_bullets(section_type)
            for i, bullet in enumerate(bullets):
                yield self._format_sse("bullet", {"index": i, "text": bullet})
            return

        try:
            yield self._format_sse("start", {"id": completion_id})

            prompt = self._get_bullet_prompt(section_type, role)
            buffer = ""

            async for chunk in self.llm_client.stream(prompt):
                buffer += chunk
                # Parse bullets as they come in
                bullets = self._parse_bullets(buffer)
                for i, bullet in enumerate(bullets):
                    yield self._format_sse("bullet", {"index": i, "text": bullet})

            yield self._format_sse("end", {"id": completion_id})

        except Exception as e:
            logger.error(f"Bullet streaming error: {e}")
            yield self._format_sse("error", {"message": str(e)})

    def _format_sse(self, event_type: str, data: dict) -> str:
        """Format data as SSE message."""
        return f"data: {json.dumps({'type': event_type, **data})}\n\n"

    def _get_bullet_prompt(self, section_type: str, role: str | None) -> str:
        """Get prompt for bullet generation."""
        return f"""Generate 3 professional bullet points for a {section_type} section.
Role: {role or 'Professional'}

Each bullet should:
- Start with a strong action verb
- Include quantifiable impact
- Be specific and achievement-oriented

Return as JSON array."""

    def _get_template_bullets(self, section_type: str) -> list[str]:
        """Get template bullets."""
        templates = {
            "experience": [
                "Led development of new features",
                "Collaborated with cross-functional teams",
                "Optimized system performance",
            ],
            "projects": [
                "Built a full-stack application",
                "Developed machine learning model",
                "Created RESTful API",
            ],
        }
        return templates.get(section_type, templates["experience"])

    def _parse_bullets(self, text: str) -> list[str]:
        """Parse bullets from text."""
        import json

        try:
            # Try to parse as JSON
            if "[" in text and "]" in text:
                start = text.index("[")
                end = text.rindex("]") + 1
                bullets = json.loads(text[start:end])
                return bullets if isinstance(bullets, list) else []
        except:
            pass

        # Fallback: split by newlines or bullets
        lines = [
            l.strip()
            for l in text.split("\n")
            if l.strip() and not l.strip().startswith(("{", "}", "["))
        ]
        return [l.lstrip("-•* ").strip() for l in lines]

    async def cancel_streaming(self, completion_id: str):
        """
        Cancel in-progress streaming.

        Args:
            completion_id: Completion ID to cancel
        """
        # Implementation would track active streams
        logger.debug(f"Cancelling streaming for {completion_id}")


# SSE event types
SSE_EVENT_START = "start"
SSE_EVENT_CHUNK = "chunk"
SSE_EVENT_BULLET = "bullet"
SSE_EVENT_END = "end"
SSE_EVENT_ERROR = "error"
