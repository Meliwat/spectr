"""Tests for worker.notify completion email helper."""
import os
from unittest.mock import patch, MagicMock


def test_send_manual_completion_email_no_api_key_returns_silently():
    """When RESEND_API_KEY is unset the helper warns and returns without HTTP."""
    from notify import send_manual_completion_email

    with patch.dict(os.environ, {}, clear=False):
        os.environ.pop('RESEND_API_KEY', None)
        # Should not raise.
        send_manual_completion_email(
            user_email='test@example.com',
            project_id='abc-123',
            signed_url='https://example.com/spec.md',
        )


def test_send_manual_completion_email_posts_to_resend():
    """When RESEND_API_KEY is set, the helper POSTs the right payload."""
    from notify import send_manual_completion_email

    fake_response = MagicMock()
    fake_response.raise_for_status.return_value = None
    fake_response.status_code = 200

    with patch.dict(os.environ, {
        'RESEND_API_KEY': 'rk_test_xxx',
        'RESEND_FROM': 'spectr <hello@spectr.to>',
    }):
        with patch('notify.requests.post', return_value=fake_response) as mock_post:
            send_manual_completion_email(
                user_email='user@example.com',
                project_id='abc-123',
                signed_url='https://x.supabase.co/storage/.../spec.md?token=...',
            )

    assert mock_post.call_count == 1
    call = mock_post.call_args
    assert call.args[0] == 'https://api.resend.com/emails'
    headers = call.kwargs['headers']
    assert headers['Authorization'] == 'Bearer rk_test_xxx'
    body = call.kwargs['json']
    assert body['from'] == 'spectr <hello@spectr.to>'
    assert body['to'] == 'user@example.com'
    assert 'spec is ready' in body['subject'].lower()
    assert 'abc-123' in body['html']
    assert 'spec.md?token=' in body['html']


def test_send_manual_completion_email_swallows_post_errors():
    """If Resend returns 500, the helper logs and does not raise."""
    from notify import send_manual_completion_email

    fake_response = MagicMock()
    fake_response.raise_for_status.side_effect = Exception('boom')
    fake_response.status_code = 500

    with patch.dict(os.environ, {'RESEND_API_KEY': 'rk_test_xxx'}):
        with patch('notify.requests.post', return_value=fake_response):
            # Should not raise.
            send_manual_completion_email(
                user_email='u@x.com',
                project_id='id',
                signed_url='url',
            )
