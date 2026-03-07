"""
Email service for sending transactional emails.

Provides functions for sending email verification emails and other
transactional communications.
"""

import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

import aiosmtplib

from config import settings

logger = logging.getLogger(__name__)


async def send_email(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: Optional[str] = None,
) -> bool:
    """
    Send an email using SMTP.

    Args:
        to_email: Recipient email address
        subject: Email subject line
        html_content: HTML email body
        text_content: Plain text email body (optional)

    Returns:
        True if email was sent successfully, False otherwise
    """
    if not all([settings.smtp_host, settings.smtp_user, settings.smtp_password]):
        logger.warning("SMTP not configured, skipping email send", to=to_email)
        return False

    try:
        message = MIMEMultipart("alternative")
        message["From"] = settings.smtp_from
        message["To"] = to_email
        message["Subject"] = subject

        if text_content:
            part_text = MIMEText(text_content, "plain")
            message.attach(part_text)

        part_html = MIMEText(html_content, "html")
        message.attach(part_html)

        await aiosmtplib.send(
            message,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_user,
            password=settings.smtp_password,
            use_tls=settings.smtp_use_tls,
        )

        logger.info("Email sent successfully", to=to_email, subject=subject)
        return True

    except Exception as e:
        logger.error("Failed to send email", to=to_email, error=str(e))
        return False


async def send_verification_email(to_email: str, verification_token: str, username: str) -> bool:
    """
    Send an email verification link to a user.

    Args:
        to_email: Recipient email address
        verification_token: Verification token for the user
        username: User's username

    Returns:
        True if email was sent successfully, False otherwise
    """
    verification_url = f"{settings.frontend_url}/auth/verify-email?token={verification_token}"

    subject = "Verify Your Email Address - ResumeAI"

    text_content = f"""Hi {username},

Thank you for signing up for ResumeAI!

Please verify your email address by clicking the link below:

{verification_url}

This link will expire in 24 hours.

If you did not create an account, you can safely ignore this email.

Best regards,
The ResumeAI Team
"""

    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email - ResumeAI</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }}
        .container {{
            background: #f9fafb;
            border-radius: 8px;
            padding: 30px;
        }}
        .header {{
            text-align: center;
            margin-bottom: 30px;
        }}
        .logo {{
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
        }}
        .content {{
            background: white;
            border-radius: 8px;
            padding: 25px;
            margin-bottom: 20px;
        }}
        h1 {{
            color: #1f2937;
            margin-top: 0;
        }}
        .button {{
            display: inline-block;
            background: #2563eb;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
        }}
        .button:hover {{
            background: #1d4ed8;
        }}
        .footer {{
            text-align: center;
            color: #6b7280;
            font-size: 14px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">ResumeAI</div>
        </div>
        <div class="content">
            <h1>Verify Your Email Address</h1>
            <p>Hi {username},</p>
            <p>Thank you for signing up for ResumeAI!</p>
            <p>Please verify your email address by clicking the button below:</p>
            <p style="text-align: center;">
                <a href="{verification_url}" class="button">Verify Email</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #2563eb;">{verification_url}</p>
            <p><strong>This link will expire in 24 hours.</strong></p>
            <p>If you did not create an account, you can safely ignore this email.</p>
        </div>
        <div class="footer">
            <p>&copy; 2026 ResumeAI. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
"""

    return await send_email(to_email, subject, html_content, text_content)
