"""Resend transactional email helpers for the worker."""
from __future__ import annotations

import logging
import os
from typing import Optional

import requests

log = logging.getLogger(__name__)


def send_manual_completion_email(
    *,
    user_email: Optional[str],
    project_id: str,
    signed_url: str,
) -> None:
    """Notifies a user that their free-sample spec is ready.

    Non-blocking: logs and swallows errors. The worker's pipeline does not
    depend on email delivery.
    """
    api_key = os.environ.get('RESEND_API_KEY')
    if not api_key:
        log.warning('RESEND_API_KEY not set, skipping completion email')
        return
    if not user_email:
        log.warning('No user_email for project %s, skipping completion email', project_id)
        return

    from_address = os.environ.get('RESEND_FROM') or 'spectr <onboarding@resend.dev>'

    dashboard_url = f'https://www.spectr.to/app/projects/{project_id}'
    html = f"""
        <p>Your free Spectr spec is ready.</p>
        <p><a href="{signed_url}">Download spec.md</a> (link valid for 24 hours)</p>
        <p>Or view it in your dashboard: <a href="{dashboard_url}">{dashboard_url}</a></p>
        <p>Thanks for trying Spectr.</p>
    """

    try:
        response = requests.post(
            'https://api.resend.com/emails',
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {api_key}',
            },
            json={
                'from': from_address,
                'to': user_email,
                'subject': 'Your Spectr spec is ready',
                'html': html,
            },
            timeout=10,
        )
        response.raise_for_status()
    except Exception as exc:
        log.error('Failed to send completion email for project %s: %s', project_id, exc)
