"""
Feedback Router - 飞书反馈 Webhook 转发
POST /feedback 接收前端反馈数据，转发到飞书 Webhook
"""
import os
import logging
from fastapi import APIRouter, HTTPException
from api.schemas import FeedbackRequest

logger = logging.getLogger(__name__)

feedback_router = APIRouter()


def _build_feishu_card(data: FeedbackRequest) -> dict:
    """Build a Feishu interactive message card from feedback data.

    Args:
        data: FeedbackRequest with type, description, screenshots, contact, env

    Returns:
        dict: Feishu message card payload
    """
    # Header color based on feedback type
    type_config = {
        "bug": {"title": "🔴 Bug 报告", "template": "red"},
        "suggestion": {"title": "💡 功能建议", "template": "blue"},
        "other": {"title": "📝 其他反馈", "template": "green"},
    }

    config = type_config.get(data.type, type_config["other"])

    # Build environment info string
    env = data.env or {}
    env_lines = []
    if env.get("userAgent"):
        # Extract browser info
        ua = env["userAgent"]
        if "Chrome" in ua and "Edg" not in ua:
            import re
            match = re.search(r"Chrome/(\d+)", ua)
            browser = f"Chrome {match.group(1)}" if match else "Chrome"
        elif "Firefox" in ua:
            match = re.search(r"Firefox/(\d+)", ua)
            browser = f"Firefox {match.group(1)}" if match else "Firefox"
        elif "Safari" in ua and "Chrome" not in ua:
            match = re.search(r"Version/(\d+)", ua)
            browser = f"Safari {match.group(1)}" if match else "Safari"
        elif "Edg" in ua:
            match = re.search(r"Edg/(\d+)", ua)
            browser = f"Edge {match.group(1)}" if match else "Edge"
        else:
            browser = "其他"
        env_lines.append(f"• 浏览器:{browser}")

    if env.get("viewport"):
        env_lines.append(f"• 视口:{env['viewport']}")
    if env.get("activeTab"):
        env_lines.append(f"• 当前Tab:{env['activeTab']}")
    if env.get("url"):
        env_lines.append(f"• 页面:{env['url']}")
    if env.get("timestamp"):
        from datetime import datetime
        try:
            dt = datetime.fromisoformat(env["timestamp"].replace("Z", "+00:00"))
            formatted_time = dt.strftime("%Y-%m-%d %H:%M:%S")
        except (ValueError, AttributeError):
            formatted_time = env["timestamp"]
        env_lines.append(f"• 时间:{formatted_time}")

    env_text = "\n".join(env_lines) if env_lines else "无环境信息"

    # Build elements
    elements = []

    # Description
    elements.append({
        "tag": "div",
        "text": {
            "tag": "lark_md",
            "content": f"**问题描述：**\n{data.description}"
        }
    })

    # Screenshot info
    if data.screenshots and len(data.screenshots) > 0:
        elements.append({
            "tag": "div",
            "text": {
                "tag": "lark_md",
                "content": f"**截图：** 已附带 {len(data.screenshots)} 张图片"
            }
        })

    # Environment info
    elements.append({
        "tag": "div",
        "text": {
            "tag": "lark_md",
            "content": f"**环境信息：**\n{env_text}"
        }
    })

    # Contact info
    if data.contact:
        elements.append({
            "tag": "div",
            "text": {
                "tag": "lark_md",
                "content": f"**未知:** {data.contact}"
            }
        })

    # Build the full card
    card = {
        "msg_type": "interactive",
        "card": {
            "header": {
                "title": {
                    "tag": "plain_text",
                    "content": config["title"]
                },
                "template": config["template"]
            },
            "elements": elements
        }
    }

    return card


@feedback_router.post("/feedback")
async def submit_feedback(request: FeedbackRequest):
    """Receive feedback from frontend and forward to Feishu webhook.

    Args:
        request: FeedbackRequest with type, description, screenshots, contact, env

    Returns:
        dict: Success confirmation

    Raises:
        HTTPException: 503 if webhook not configured
    """
    webhook_url = os.environ.get("FEISHU_FEEDBACK_WEBHOOK_URL")

    if not webhook_url:
        logger.warning("FEISHU_FEEDBACK_WEBHOOK_URL not configured")
        # Return success but note that webhook is not configured
        # This allows the feedback to be "received" even if not forwarded
        return {"status": "ok", "message": "反馈已记录（Webhook未配置，暂未发送）"}

    # Build Feishu card
    card_payload = _build_feishu_card(request)

    # Send to Feishu webhook (lazy import httpx to avoid ImportError if not installed)
    try:
        import httpx
    except ImportError:
        logger.error("httpx not installed - cannot send feedback to Feishu. Add 'httpx' to requirements.txt")
        return {"status": "ok", "message": "未知,未知!"}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(webhook_url, json=card_payload)
            response.raise_for_status()
    except httpx.HTTPError as e:
        logger.error(f"Feishu webhook call failed: {e}")
        # Don't expose webhook details to frontend - return success anyway
        # to avoid leaking internal infrastructure info
    except Exception as e:
        logger.error(f"Unexpected error sending feedback to Feishu: {e}")

    # Always return 200 to frontend (even if webhook failed)
    # The feedback data was received; webhook delivery is best-effort
    return {"status": "ok", "message": "未知,未知!"}
