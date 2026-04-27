"""
Tests for:
  POST /api/v1/chat

The Anthropic API call is mocked in every test — no real API key needed.
The RAG retriever is mocked in RAG-specific tests to verify it is called
correctly and its output lands in the system prompt.
"""

import pytest
from unittest.mock import patch, MagicMock

CHAT_URL = "/api/v1/chat"

ANTHROPIC_PATCH = "app.routes.chat.anthropic.Anthropic"
RETRIEVE_PATCH  = "app.routes.chat.retrieve"          # ← patch point for RAG


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def mock_anthropic_response(text="I can help you with that!"):
    mock_content          = MagicMock()
    mock_content.text     = text
    mock_response         = MagicMock()
    mock_response.content = [mock_content]
    return mock_response


def valid_payload(content="What venues do you have?"):
    return {"messages": [{"role": "user", "content": content}]}


# Authentication & authorisation

class TestChatAuth:

    def test_requires_authentication(self, client):
        res = client.post(CHAT_URL, json=valid_payload())
        assert res.status_code == 401

    def test_customer_can_access(self, client, customer_token):
        with patch(ANTHROPIC_PATCH) as mock_cls:
            mock_cls.return_value.messages.create.return_value = mock_anthropic_response()
            res = client.post(CHAT_URL, json=valid_payload(), headers=auth(customer_token))
        assert res.status_code == 200

    def test_manager_can_access(self, client, manager_token):
        with patch(ANTHROPIC_PATCH) as mock_cls:
            mock_cls.return_value.messages.create.return_value = mock_anthropic_response()
            res = client.post(CHAT_URL, json=valid_payload(), headers=auth(manager_token))
        assert res.status_code == 200

    def test_admin_can_access(self, client, admin_token):
        with patch(ANTHROPIC_PATCH) as mock_cls:
            mock_cls.return_value.messages.create.return_value = mock_anthropic_response()
            res = client.post(CHAT_URL, json=valid_payload(), headers=auth(admin_token))
        assert res.status_code == 200


# Request validation

class TestChatValidation:

    def test_no_body_returns_400(self, client, customer_token):
        res = client.post(CHAT_URL, headers=auth(customer_token))
        assert res.status_code == 400

    def test_missing_messages_key_returns_400(self, client, customer_token):
        res = client.post(CHAT_URL, json={"text": "hello"}, headers=auth(customer_token))
        assert res.status_code == 400

    def test_empty_messages_array_returns_400(self, client, customer_token):
        res = client.post(CHAT_URL, json={"messages": []}, headers=auth(customer_token))
        assert res.status_code == 400

    def test_invalid_role_returns_400(self, client, customer_token):
        payload = {"messages": [{"role": "system", "content": "hello"}]}
        res = client.post(CHAT_URL, json=payload, headers=auth(customer_token))
        assert res.status_code == 400

    def test_empty_content_returns_400(self, client, customer_token):
        payload = {"messages": [{"role": "user", "content": ""}]}
        res = client.post(CHAT_URL, json=payload, headers=auth(customer_token))
        assert res.status_code == 400

    def test_messages_not_a_list_returns_400(self, client, customer_token):
        payload = {"messages": "hello"}
        res = client.post(CHAT_URL, json=payload, headers=auth(customer_token))
        assert res.status_code == 400


# Successful responses

class TestChatSuccess:

    def test_returns_reply_key(self, client, customer_token):
        with patch(ANTHROPIC_PATCH) as mock_cls:
            mock_cls.return_value.messages.create.return_value = \
                mock_anthropic_response("We have three venues available.")
            res = client.post(CHAT_URL, json=valid_payload(), headers=auth(customer_token))
        assert res.status_code == 200
        assert "reply" in res.get_json()

    def test_reply_matches_mocked_response(self, client, customer_token):
        expected = "The Grand Pavilion seats 500 guests."
        with patch(ANTHROPIC_PATCH) as mock_cls:
            mock_cls.return_value.messages.create.return_value = \
                mock_anthropic_response(expected)
            res = client.post(CHAT_URL, json=valid_payload(), headers=auth(customer_token))
        assert res.get_json()["reply"] == expected

    def test_multi_turn_conversation_passes_all_messages(self, client, customer_token):
        messages = [
            {"role": "user",      "content": "What venues do you have?"},
            {"role": "assistant", "content": "We have The Grand Pavilion and more."},
            {"role": "user",      "content": "What is the capacity of the first one?"},
        ]
        with patch(ANTHROPIC_PATCH) as mock_cls:
            mock_instance = mock_cls.return_value
            mock_instance.messages.create.return_value = mock_anthropic_response("500 guests.")
            res = client.post(CHAT_URL, json={"messages": messages},
                              headers=auth(customer_token))
            call_kwargs = mock_instance.messages.create.call_args.kwargs
            assert len(call_kwargs["messages"]) == 3
        assert res.status_code == 200

    def test_correct_model_is_used(self, client, customer_token):
        with patch(ANTHROPIC_PATCH) as mock_cls:
            mock_instance = mock_cls.return_value
            mock_instance.messages.create.return_value = mock_anthropic_response()
            client.post(CHAT_URL, json=valid_payload(), headers=auth(customer_token))
            call_kwargs = mock_instance.messages.create.call_args.kwargs
            assert call_kwargs["model"] == "claude-haiku-4-5-20251001"

    def test_system_prompt_is_sent(self, client, customer_token):
        with patch(ANTHROPIC_PATCH) as mock_cls:
            mock_instance = mock_cls.return_value
            mock_instance.messages.create.return_value = mock_anthropic_response()
            client.post(CHAT_URL, json=valid_payload(), headers=auth(customer_token))
            call_kwargs = mock_instance.messages.create.call_args.kwargs
            assert "system" in call_kwargs
            assert len(call_kwargs["system"]) > 100

    def test_system_prompt_includes_live_venue_data(self, client, customer_token,
                                                     seed_venue):
        with patch(ANTHROPIC_PATCH) as mock_cls:
            mock_instance = mock_cls.return_value
            mock_instance.messages.create.return_value = mock_anthropic_response()
            client.post(CHAT_URL, json=valid_payload(), headers=auth(customer_token))
            system = mock_instance.messages.create.call_args.kwargs["system"]
            assert "Test Pavilion" in system


# RAG — retrieval behaviour

class TestChatRAG:

    def test_retrieve_is_called_with_latest_user_message(self, client, customer_token):
        """Retriever should be called with the last user message as the query."""
        with patch(RETRIEVE_PATCH, return_value=[]) as mock_retrieve, \
             patch(ANTHROPIC_PATCH) as mock_cls:
            mock_cls.return_value.messages.create.return_value = mock_anthropic_response()
            client.post(CHAT_URL,
                        json=valid_payload("What is your cancellation policy?"),
                        headers=auth(customer_token))
        mock_retrieve.assert_called_once_with("What is your cancellation policy?",
                                              n_results=3)

    def test_retrieve_called_with_last_user_message_in_multi_turn(self, client,
                                                                    customer_token):
        """In a multi-turn conversation, only the latest user message is used as query."""
        messages = [
            {"role": "user",      "content": "Tell me about venues."},
            {"role": "assistant", "content": "We have several venues available."},
            {"role": "user",      "content": "What about your refund policy?"},
        ]
        with patch(RETRIEVE_PATCH, return_value=[]) as mock_retrieve, \
             patch(ANTHROPIC_PATCH) as mock_cls:
            mock_cls.return_value.messages.create.return_value = mock_anthropic_response()
            client.post(CHAT_URL, json={"messages": messages},
                        headers=auth(customer_token))
        # Should use the last user message, not the first
        mock_retrieve.assert_called_once_with("What about your refund policy?",
                                              n_results=3)

    def test_retrieved_chunks_appear_in_system_prompt(self, client, customer_token):
        """When the retriever returns chunks, they must be present in the system prompt."""
        fake_chunks = [
            "Cancellations must go through the event manager directly.",
            "Last-minute cancellations may affect deposit refunds.",
        ]
        with patch(RETRIEVE_PATCH, return_value=fake_chunks), \
             patch(ANTHROPIC_PATCH) as mock_cls:
            mock_instance = mock_cls.return_value
            mock_instance.messages.create.return_value = mock_anthropic_response()
            client.post(CHAT_URL,
                        json=valid_payload("Can I cancel my booking?"),
                        headers=auth(customer_token))
            system = mock_instance.messages.create.call_args.kwargs["system"]

        assert "Cancellations must go through the event manager directly." in system
        assert "Last-minute cancellations may affect deposit refunds." in system

    def test_rag_section_absent_when_no_chunks_retrieved(self, client, customer_token):
        """When retriever returns empty list, RAG section should not appear in prompt."""
        with patch(RETRIEVE_PATCH, return_value=[]), \
             patch(ANTHROPIC_PATCH) as mock_cls:
            mock_instance = mock_cls.return_value
            mock_instance.messages.create.return_value = mock_anthropic_response()
            client.post(CHAT_URL, json=valid_payload("Hi there"),
                        headers=auth(customer_token))
            system = mock_instance.messages.create.call_args.kwargs["system"]

        assert "RELEVANT BUSINESS KNOWLEDGE" not in system

    def test_rag_section_present_when_chunks_retrieved(self, client, customer_token):
        """When retriever returns chunks, the RAG section header should be in the prompt."""
        with patch(RETRIEVE_PATCH, return_value=["Some policy text here."]), \
             patch(ANTHROPIC_PATCH) as mock_cls:
            mock_instance = mock_cls.return_value
            mock_instance.messages.create.return_value = mock_anthropic_response()
            client.post(CHAT_URL,
                        json=valid_payload("What is your cancellation policy?"),
                        headers=auth(customer_token))
            system = mock_instance.messages.create.call_args.kwargs["system"]

        assert "RELEVANT BUSINESS KNOWLEDGE" in system

    def test_multiple_chunks_all_appear_in_system_prompt(self, client, customer_token):
        """All retrieved chunks should appear in the system prompt, not just the first."""
        fake_chunks = [
            "Chunk one about weddings.",
            "Chunk two about catering.",
            "Chunk three about outdoor events.",
        ]
        with patch(RETRIEVE_PATCH, return_value=fake_chunks), \
             patch(ANTHROPIC_PATCH) as mock_cls:
            mock_instance = mock_cls.return_value
            mock_instance.messages.create.return_value = mock_anthropic_response()
            client.post(CHAT_URL,
                        json=valid_payload("Tell me everything"),
                        headers=auth(customer_token))
            system = mock_instance.messages.create.call_args.kwargs["system"]

        for chunk in fake_chunks:
            assert chunk in system


# API error handling

class TestChatErrorHandling:

    def test_auth_error_returns_503(self, client, customer_token):
        import anthropic as anthropic_lib
        with patch(ANTHROPIC_PATCH) as mock_cls:
            mock_cls.return_value.messages.create.side_effect = \
                anthropic_lib.AuthenticationError(
                    message="Invalid API key",
                    response=MagicMock(status_code=401),
                    body={},
                )
            res = client.post(CHAT_URL, json=valid_payload(), headers=auth(customer_token))
        assert res.status_code == 503

    def test_rate_limit_returns_429(self, client, customer_token):
        import anthropic as anthropic_lib
        with patch(ANTHROPIC_PATCH) as mock_cls:
            mock_cls.return_value.messages.create.side_effect = \
                anthropic_lib.RateLimitError(
                    message="Rate limit exceeded",
                    response=MagicMock(status_code=429),
                    body={},
                )
            res = client.post(CHAT_URL, json=valid_payload(), headers=auth(customer_token))
        assert res.status_code == 429

    def test_missing_api_key_returns_503(self, client, customer_token, app):
        original_key = app.config.get("ANTHROPIC_API_KEY")
        app.config["ANTHROPIC_API_KEY"] = ""
        try:
            res = client.post(CHAT_URL, json=valid_payload(), headers=auth(customer_token))
            assert res.status_code == 503
            assert "not configured" in res.get_json()["message"]
        finally:
            app.config["ANTHROPIC_API_KEY"] = original_key