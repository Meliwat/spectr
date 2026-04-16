"""Tests for the credit-refund flow when an auto project fails."""
import sys
import os
from unittest.mock import MagicMock

# ---------------------------------------------------------------------------
# Make the worker package importable without installing it.
# Stub heavy third-party imports before local_worker is imported.
# ---------------------------------------------------------------------------
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

for mod_name in ("supabase", "dotenv", "imagehash"):
    if mod_name not in sys.modules:
        stub = MagicMock()
        sys.modules[mod_name] = stub
        if mod_name == "supabase":
            stub.create_client = MagicMock()

if "PIL" not in sys.modules:
    sys.modules["PIL"] = MagicMock()
    sys.modules["PIL.Image"] = MagicMock()


def test_refund_credit_for_failed_auto_project_flips_status():
    """When an auto project fails, the consumed credit flips to available."""
    from local_worker import refund_credit_for_failed_project

    client = MagicMock()
    # Simulate the project lookup returning processing_mode='auto'.
    project_query = MagicMock()
    project_query.execute.return_value = MagicMock(data={'processing_mode': 'auto'})
    client.table.return_value.select.return_value.eq.return_value.single.return_value = project_query

    # Simulate the credits update.
    credits_update = MagicMock()
    credits_update.execute.return_value = MagicMock(data=[{'id': 'cred-1'}])
    client.table.return_value.update.return_value.eq.return_value.eq.return_value = credits_update

    refund_credit_for_failed_project(client, 'project-123')

    # Verify the spec_credits update was called.
    update_calls = [c for c in client.table.call_args_list if c.args == ('spec_credits',)]
    assert len(update_calls) == 1


def test_refund_credit_skipped_for_manual_project():
    """Manual projects don't have credits attached, so refund is a no-op."""
    from local_worker import refund_credit_for_failed_project

    client = MagicMock()
    project_query = MagicMock()
    project_query.execute.return_value = MagicMock(data={'processing_mode': 'manual'})
    client.table.return_value.select.return_value.eq.return_value.single.return_value = project_query

    refund_credit_for_failed_project(client, 'project-123')

    # spec_credits.update should not be called for manual projects.
    spec_credits_calls = [c for c in client.table.call_args_list if c.args == ('spec_credits',)]
    assert len(spec_credits_calls) == 0


def test_refund_credit_swallows_exceptions():
    """If the refund fails (DB error, etc.), the function logs but does not raise."""
    from local_worker import refund_credit_for_failed_project

    client = MagicMock()
    client.table.side_effect = Exception('db unreachable')

    # Should not raise.
    refund_credit_for_failed_project(client, 'project-123')
