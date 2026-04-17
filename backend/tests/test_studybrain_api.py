"""
StudyBrain API Tests
Tests for: Health, Auth, Topics, Chat, Quiz, Dashboard, Authorization
"""
import pytest
import requests
import os
import uuid
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# ============ FIXTURES ============

@pytest.fixture(scope="session")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="session")
def test_user_credentials():
    """Generate unique test user credentials"""
    unique_id = uuid.uuid4().hex[:8]
    return {
        "email": f"TEST_user_{unique_id}@studybrain.app",
        "password": "password123",
        "name": f"Test User {unique_id}"
    }


@pytest.fixture(scope="session")
def registered_user(api_client, test_user_credentials):
    """Register a test user and return token + user data"""
    response = api_client.post(f"{BASE_URL}/api/auth/register", json=test_user_credentials)
    if response.status_code == 200:
        data = response.json()
        return {"token": data["token"], "user": data["user"], "credentials": test_user_credentials}
    pytest.skip(f"Could not register test user: {response.text}")


@pytest.fixture(scope="session")
def auth_headers(registered_user):
    """Auth headers for authenticated requests"""
    return {"Authorization": f"Bearer {registered_user['token']}"}


@pytest.fixture(scope="session")
def second_user_credentials():
    """Generate unique credentials for second user (authorization tests)"""
    unique_id = uuid.uuid4().hex[:8]
    return {
        "email": f"TEST_user2_{unique_id}@studybrain.app",
        "password": "password123",
        "name": f"Test User 2 {unique_id}"
    }


@pytest.fixture(scope="session")
def second_user(api_client, second_user_credentials):
    """Register a second test user for authorization tests"""
    response = api_client.post(f"{BASE_URL}/api/auth/register", json=second_user_credentials)
    if response.status_code == 200:
        data = response.json()
        return {"token": data["token"], "user": data["user"]}
    pytest.skip(f"Could not register second test user: {response.text}")


# ============ HEALTH CHECK ============

class TestHealth:
    """Health endpoint tests"""
    
    def test_health_endpoint(self, api_client):
        """GET /api/ returns service status"""
        response = api_client.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data.get("service") == "StudyBrain"
        assert data.get("status") == "ok"
        print(f"Health check passed: {data}")


# ============ AUTH TESTS ============

class TestAuth:
    """Authentication endpoint tests"""
    
    def test_register_creates_user(self, api_client):
        """POST /api/auth/register creates user and returns JWT+user"""
        unique_id = uuid.uuid4().hex[:8]
        payload = {
            "email": f"TEST_reg_{unique_id}@studybrain.app",
            "password": "password123",
            "name": f"Reg Test {unique_id}"
        }
        response = api_client.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response.status_code == 200, f"Register failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "No token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["email"] == payload["email"]
        assert data["user"]["name"] == payload["name"]
        assert "user_id" in data["user"]
        assert len(data["token"]) > 0
        print(f"Registration successful: {data['user']['email']}")
    
    def test_duplicate_registration_returns_400(self, api_client, registered_user):
        """POST /api/auth/register with existing email returns 400"""
        payload = registered_user["credentials"]
        response = api_client.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        print(f"Duplicate registration correctly rejected: {data['detail']}")
    
    def test_login_with_valid_credentials(self, api_client, registered_user):
        """POST /api/auth/login with valid credentials returns JWT"""
        payload = {
            "email": registered_user["credentials"]["email"],
            "password": registered_user["credentials"]["password"]
        }
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=payload)
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == payload["email"]
        print(f"Login successful for: {data['user']['email']}")
    
    def test_login_with_wrong_password_returns_401(self, api_client, registered_user):
        """POST /api/auth/login with wrong password returns 401"""
        payload = {
            "email": registered_user["credentials"]["email"],
            "password": "wrongpassword123"
        }
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=payload)
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Wrong password correctly rejected with 401")
    
    def test_auth_me_with_valid_token(self, api_client, auth_headers, registered_user):
        """GET /api/auth/me with Bearer token returns user"""
        response = api_client.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
        assert response.status_code == 200, f"Auth/me failed: {response.text}"
        
        data = response.json()
        assert data["email"] == registered_user["credentials"]["email"]
        assert "user_id" in data
        print(f"Auth/me returned user: {data['email']}")
    
    def test_auth_me_without_token_returns_401(self, api_client):
        """GET /api/auth/me without token returns 401"""
        response = api_client.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Auth/me without token correctly rejected with 401")
    
    def test_logout_clears_session(self, api_client, auth_headers):
        """POST /api/auth/logout returns ok"""
        response = api_client.post(f"{BASE_URL}/api/auth/logout", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") == True
        print("Logout successful")


# ============ TOPICS TESTS ============

class TestTopics:
    """Topics CRUD tests"""
    
    def test_create_topic(self, api_client, auth_headers):
        """POST /api/topics creates topic"""
        payload = {
            "title": "TEST_Calculus Derivatives",
            "description": "Focus on chain rule",
            "level": "intermediate"
        }
        response = api_client.post(f"{BASE_URL}/api/topics", json=payload, headers=auth_headers)
        assert response.status_code == 200, f"Create topic failed: {response.text}"
        
        data = response.json()
        assert data["title"] == payload["title"]
        assert data["description"] == payload["description"]
        assert data["level"] == payload["level"]
        assert "topic_id" in data
        assert data["mastery"] == 0.0
        print(f"Topic created: {data['topic_id']}")
        return data["topic_id"]
    
    def test_list_topics(self, api_client, auth_headers):
        """GET /api/topics lists user's topics"""
        response = api_client.get(f"{BASE_URL}/api/topics", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Listed {len(data)} topics")
    
    def test_get_topic_by_id(self, api_client, auth_headers):
        """GET /api/topics/{id} retrieves topic"""
        # First create a topic
        create_resp = api_client.post(f"{BASE_URL}/api/topics", json={
            "title": "TEST_Get Topic Test",
            "level": "beginner"
        }, headers=auth_headers)
        topic_id = create_resp.json()["topic_id"]
        
        # Then get it
        response = api_client.get(f"{BASE_URL}/api/topics/{topic_id}", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["topic_id"] == topic_id
        assert data["title"] == "TEST_Get Topic Test"
        print(f"Retrieved topic: {topic_id}")
    
    def test_delete_topic(self, api_client, auth_headers):
        """DELETE /api/topics/{id} deletes topic"""
        # First create a topic
        create_resp = api_client.post(f"{BASE_URL}/api/topics", json={
            "title": "TEST_Delete Topic Test",
            "level": "beginner"
        }, headers=auth_headers)
        topic_id = create_resp.json()["topic_id"]
        
        # Delete it
        response = api_client.delete(f"{BASE_URL}/api/topics/{topic_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["deleted"] == 1
        
        # Verify it's gone
        get_resp = api_client.get(f"{BASE_URL}/api/topics/{topic_id}", headers=auth_headers)
        assert get_resp.status_code == 404
        print(f"Topic deleted and verified: {topic_id}")


# ============ CHAT TESTS (Claude Sonnet 4.5 via emergentintegrations) ============

class TestChat:
    """Chat endpoint tests - verifies Claude Sonnet 4.5 integration"""
    
    @pytest.fixture
    def chat_topic(self, api_client, auth_headers):
        """Create a topic for chat testing"""
        response = api_client.post(f"{BASE_URL}/api/topics", json={
            "title": "TEST_Python Basics",
            "description": "Learning Python fundamentals",
            "level": "beginner"
        }, headers=auth_headers)
        return response.json()
    
    def test_chat_returns_response_and_memory(self, api_client, auth_headers, chat_topic):
        """POST /api/topics/{id}/chat returns user_message, assistant_message, memory"""
        topic_id = chat_topic["topic_id"]
        payload = {"message": "What is a variable in Python?"}
        
        response = api_client.post(
            f"{BASE_URL}/api/topics/{topic_id}/chat",
            json=payload,
            headers=auth_headers,
            timeout=60  # LLM calls can take time
        )
        assert response.status_code == 200, f"Chat failed: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "user_message" in data, "Missing user_message"
        assert "assistant_message" in data, "Missing assistant_message"
        assert "memory" in data, "Missing memory"
        
        # Verify user message
        assert data["user_message"]["role"] == "user"
        assert data["user_message"]["content"] == payload["message"]
        
        # Verify assistant message (Claude Sonnet 4.5 response)
        assert data["assistant_message"]["role"] == "assistant"
        assert len(data["assistant_message"]["content"]) > 0, "Empty assistant response"
        print(f"Claude response length: {len(data['assistant_message']['content'])} chars")
        
        # Verify memory structure
        memory = data["memory"]
        assert "topic_id" in memory
        assert "concepts" in memory
        assert "mistakes" in memory
        assert "strengths" in memory
        assert "summary" in memory
        
        print(f"Chat successful. Memory concepts: {len(memory.get('concepts', []))}")
        print(f"Assistant response preview: {data['assistant_message']['content'][:200]}...")
    
    def test_get_messages(self, api_client, auth_headers, chat_topic):
        """GET /api/topics/{id}/messages returns chronological messages"""
        topic_id = chat_topic["topic_id"]
        
        # First send a message
        api_client.post(
            f"{BASE_URL}/api/topics/{topic_id}/chat",
            json={"message": "Explain lists in Python"},
            headers=auth_headers,
            timeout=60
        )
        
        # Get messages
        response = api_client.get(f"{BASE_URL}/api/topics/{topic_id}/messages", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 2  # At least user + assistant
        
        # Verify chronological order
        for i in range(1, len(data)):
            assert data[i]["created_at"] >= data[i-1]["created_at"]
        
        print(f"Retrieved {len(data)} messages in chronological order")
    
    def test_get_memory(self, api_client, auth_headers, chat_topic):
        """GET /api/topics/{id}/memory returns hindsight memory object"""
        topic_id = chat_topic["topic_id"]
        
        response = api_client.get(f"{BASE_URL}/api/topics/{topic_id}/memory", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "topic_id" in data
        assert "concepts" in data
        assert "mistakes" in data
        assert "strengths" in data
        assert "summary" in data
        
        print(f"Memory retrieved: {len(data.get('concepts', []))} concepts tracked")


# ============ QUIZ TESTS ============

class TestQuiz:
    """Quiz generation and answer tests"""
    
    @pytest.fixture
    def quiz_topic(self, api_client, auth_headers):
        """Create a topic for quiz testing"""
        response = api_client.post(f"{BASE_URL}/api/topics", json={
            "title": "TEST_JavaScript Fundamentals",
            "description": "Core JS concepts",
            "level": "beginner"
        }, headers=auth_headers)
        return response.json()
    
    def test_generate_quiz(self, api_client, auth_headers, quiz_topic):
        """POST /api/topics/{id}/quiz generates 5-question quiz"""
        topic_id = quiz_topic["topic_id"]
        
        response = api_client.post(
            f"{BASE_URL}/api/topics/{topic_id}/quiz",
            headers=auth_headers,
            timeout=60  # LLM generation takes time
        )
        assert response.status_code == 200, f"Quiz generation failed: {response.text}"
        
        data = response.json()
        assert "quiz_id" in data
        assert "topic_id" in data
        assert "questions" in data
        assert len(data["questions"]) == 5, f"Expected 5 questions, got {len(data['questions'])}"
        
        # Verify question structure (correct_index should be hidden)
        for q in data["questions"]:
            assert "question" in q
            assert "options" in q
            assert len(q["options"]) == 4
            assert "correct_index" not in q, "correct_index should be hidden from client"
        
        print(f"Quiz generated: {data['quiz_id']} with 5 questions")
        return data
    
    def test_quiz_answer_correct(self, api_client, auth_headers, quiz_topic):
        """POST /api/quiz/answer returns correct, correct_index, explanation"""
        topic_id = quiz_topic["topic_id"]
        
        # Generate quiz
        quiz_resp = api_client.post(
            f"{BASE_URL}/api/topics/{topic_id}/quiz",
            headers=auth_headers,
            timeout=60
        )
        quiz = quiz_resp.json()
        
        # Submit an answer (we don't know correct answer, just test the endpoint)
        payload = {
            "quiz_id": quiz["quiz_id"],
            "question_index": 0,
            "selected_index": 0
        }
        response = api_client.post(f"{BASE_URL}/api/quiz/answer", json=payload, headers=auth_headers)
        assert response.status_code == 200, f"Quiz answer failed: {response.text}"
        
        data = response.json()
        assert "correct" in data
        assert isinstance(data["correct"], bool)
        assert "correct_index" in data
        assert isinstance(data["correct_index"], int)
        assert 0 <= data["correct_index"] <= 3
        assert "explanation" in data
        
        print(f"Quiz answer submitted. Correct: {data['correct']}, Explanation: {data['explanation'][:100]}...")


# ============ DASHBOARD TESTS ============

class TestDashboard:
    """Dashboard endpoint tests"""
    
    def test_dashboard_returns_stats(self, api_client, auth_headers):
        """GET /api/dashboard returns total_topics, total_messages, avg_mastery, weak_spots, topics"""
        response = api_client.get(f"{BASE_URL}/api/dashboard", headers=auth_headers)
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        
        data = response.json()
        assert "total_topics" in data
        assert "total_messages" in data
        assert "avg_mastery" in data
        assert "weak_spots" in data
        assert "topics" in data
        
        assert isinstance(data["total_topics"], int)
        assert isinstance(data["total_messages"], int)
        assert isinstance(data["avg_mastery"], (int, float))
        assert isinstance(data["weak_spots"], list)
        assert isinstance(data["topics"], list)
        
        print(f"Dashboard: {data['total_topics']} topics, {data['total_messages']} messages, {data['avg_mastery']} avg mastery")


# ============ AUTHORIZATION TESTS ============

class TestAuthorization:
    """Cross-user authorization tests"""
    
    def test_user_b_cannot_access_user_a_topic(self, api_client, auth_headers, second_user):
        """User B cannot access User A's topics (returns 404)"""
        # Create topic as User A
        create_resp = api_client.post(f"{BASE_URL}/api/topics", json={
            "title": "TEST_User A Private Topic",
            "level": "beginner"
        }, headers=auth_headers)
        topic_id = create_resp.json()["topic_id"]
        
        # Try to access as User B
        user_b_headers = {"Authorization": f"Bearer {second_user['token']}"}
        response = api_client.get(f"{BASE_URL}/api/topics/{topic_id}", headers=user_b_headers)
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"Authorization test passed: User B correctly denied access to User A's topic")
    
    def test_user_b_cannot_chat_on_user_a_topic(self, api_client, auth_headers, second_user):
        """User B cannot chat on User A's topics"""
        # Create topic as User A
        create_resp = api_client.post(f"{BASE_URL}/api/topics", json={
            "title": "TEST_User A Chat Topic",
            "level": "beginner"
        }, headers=auth_headers)
        topic_id = create_resp.json()["topic_id"]
        
        # Try to chat as User B
        user_b_headers = {"Authorization": f"Bearer {second_user['token']}"}
        response = api_client.post(
            f"{BASE_URL}/api/topics/{topic_id}/chat",
            json={"message": "Hello"},
            headers=user_b_headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"Authorization test passed: User B correctly denied chat access")


# ============ CLEANUP ============

@pytest.fixture(scope="session", autouse=True)
def cleanup(api_client, auth_headers, request):
    """Cleanup test data after all tests"""
    yield
    # Cleanup: Delete all TEST_ prefixed topics
    try:
        topics_resp = api_client.get(f"{BASE_URL}/api/topics", headers=auth_headers)
        if topics_resp.status_code == 200:
            for topic in topics_resp.json():
                if topic["title"].startswith("TEST_"):
                    api_client.delete(f"{BASE_URL}/api/topics/{topic['topic_id']}", headers=auth_headers)
                    print(f"Cleaned up topic: {topic['topic_id']}")
    except Exception as e:
        print(f"Cleanup error: {e}")
