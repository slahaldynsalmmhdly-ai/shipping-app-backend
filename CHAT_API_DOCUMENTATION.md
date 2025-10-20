# Chat API Documentation

## Overview
This document describes the Chat API endpoints for the shipping app. These endpoints enable real-time messaging between users with support for text, images, videos, and audio messages.

## Base URL
```
/api/v1/chat
```

## Authentication
All endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## Endpoints

### 1. Get All Conversations

**Endpoint:** `GET /api/v1/chat/conversations`

**Description:** Retrieve all conversations for the logged-in user, sorted by last message time.

**Access:** Private (requires authentication)

**Query Parameters:** None

**Example Request:**
```
GET /api/v1/chat/conversations
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
[
  {
    "_id": "60d5ec49f1b2c72b8c8e4f1a",
    "participant": {
      "_id": "60d5ec49f1b2c72b8c8e4f1b",
      "name": "شركة النقل السريع",
      "avatar": "https://example.com/avatar.jpg",
      "userType": "company"
    },
    "lastMessage": {
      "content": "تمام، في انتظارك",
      "messageType": "text",
      "mediaUrl": null,
      "createdAt": "2024-10-20T10:45:00.000Z",
      "isSender": false
    },
    "unreadCount": 2,
    "lastMessageTime": "2024-10-20T10:45:00.000Z"
  }
]
```

---

### 2. Create or Get Conversation

**Endpoint:** `POST /api/v1/chat/conversations`

**Description:** Create a new conversation with another user or retrieve an existing one.

**Access:** Private (requires authentication)

**Request Body:**
```json
{
  "participantId": "60d5ec49f1b2c72b8c8e4f1b"
}
```

**Example Request:**
```
POST /api/v1/chat/conversations
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "participantId": "60d5ec49f1b2c72b8c8e4f1b"
}
```

**Response:**
```json
{
  "_id": "60d5ec49f1b2c72b8c8e4f1a",
  "participant": {
    "_id": "60d5ec49f1b2c72b8c8e4f1b",
    "name": "شركة النقل السريع",
    "avatar": "https://example.com/avatar.jpg",
    "userType": "company"
  },
  "lastMessage": null,
  "unreadCount": 0,
  "lastMessageTime": "2024-10-20T10:00:00.000Z"
}
```

---

### 3. Get Messages in Conversation

**Endpoint:** `GET /api/v1/chat/conversations/:conversationId/messages`

**Description:** Retrieve all messages in a specific conversation with pagination. Automatically marks unread messages as read.

**Access:** Private (requires authentication)

**URL Parameters:**
- `conversationId` (required): The ID of the conversation

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | Number | No | 1 | Page number for pagination |
| `limit` | Number | No | 50 | Number of messages per page |

**Example Request:**
```
GET /api/v1/chat/conversations/60d5ec49f1b2c72b8c8e4f1a/messages?page=1&limit=50
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "messages": [
    {
      "_id": "60d5ec49f1b2c72b8c8e4f20",
      "sender": {
        "_id": "60d5ec49f1b2c72b8c8e4f1b",
        "name": "شركة النقل السريع",
        "avatar": "https://example.com/avatar.jpg"
      },
      "messageType": "text",
      "content": "السلام عليكم، هل الشاحنة متاحة غداً؟",
      "mediaUrl": null,
      "mediaThumbnail": null,
      "mediaSize": null,
      "mediaDuration": null,
      "isRead": true,
      "isSender": false,
      "createdAt": "2024-10-20T10:30:00.000Z"
    },
    {
      "_id": "60d5ec49f1b2c72b8c8e4f21",
      "sender": {
        "_id": "60d5ec49f1b2c72b8c8e4f1c",
        "name": "أحمد محمد",
        "avatar": "https://example.com/avatar2.jpg"
      },
      "messageType": "image",
      "content": null,
      "mediaUrl": "/uploads/chat/1634567890123-image.jpg",
      "mediaThumbnail": null,
      "mediaSize": 245678,
      "mediaDuration": null,
      "isRead": true,
      "isSender": true,
      "createdAt": "2024-10-20T10:35:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalMessages": 125,
    "hasMore": true
  }
}
```

---

### 4. Send Text Message

**Endpoint:** `POST /api/v1/chat/conversations/:conversationId/messages`

**Description:** Send a text message in a conversation.

**Access:** Private (requires authentication)

**URL Parameters:**
- `conversationId` (required): The ID of the conversation

**Request Body:**
```json
{
  "content": "مرحباً، كيف حالك؟"
}
```

**Example Request:**
```
POST /api/v1/chat/conversations/60d5ec49f1b2c72b8c8e4f1a/messages
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "content": "مرحباً، كيف حالك؟"
}
```

**Response:**
```json
{
  "_id": "60d5ec49f1b2c72b8c8e4f22",
  "sender": {
    "_id": "60d5ec49f1b2c72b8c8e4f1c",
    "name": "أحمد محمد",
    "avatar": "https://example.com/avatar2.jpg"
  },
  "messageType": "text",
  "content": "مرحباً، كيف حالك؟",
  "isRead": false,
  "isSender": true,
  "createdAt": "2024-10-20T10:40:00.000Z"
}
```

---

### 5. Send Media Message

**Endpoint:** `POST /api/v1/chat/conversations/:conversationId/media`

**Description:** Send a media message (image, video, or audio) in a conversation.

**Access:** Private (requires authentication)

**URL Parameters:**
- `conversationId` (required): The ID of the conversation

**Request Body:** (multipart/form-data)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | The media file to upload |
| `messageType` | String | No | Type of message: `image`, `video`, `audio`, or `file` (auto-detected if not provided) |
| `mediaDuration` | Number | No | Duration in seconds (for audio/video) |

**Supported File Types:**
- **Images:** JPEG, JPG, PNG, GIF
- **Videos:** MP4, MOV, AVI
- **Audio:** MP3, WAV, M4A
- **Documents:** PDF, DOC, DOCX

**File Size Limit:** 100MB

**Example Request:**
```
POST /api/v1/chat/conversations/60d5ec49f1b2c72b8c8e4f1a/media
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: multipart/form-data

file: [binary data]
messageType: audio
mediaDuration: 45
```

**Response:**
```json
{
  "_id": "60d5ec49f1b2c72b8c8e4f23",
  "sender": {
    "_id": "60d5ec49f1b2c72b8c8e4f1c",
    "name": "أحمد محمد",
    "avatar": "https://example.com/avatar2.jpg"
  },
  "messageType": "audio",
  "mediaUrl": "/uploads/chat/1634567890123-audio.mp3",
  "mediaSize": 1234567,
  "mediaDuration": 45,
  "isRead": false,
  "isSender": true,
  "createdAt": "2024-10-20T10:45:00.000Z"
}
```

---

### 6. Delete Message

**Endpoint:** `DELETE /api/v1/chat/messages/:messageId`

**Description:** Delete a message for the current user (soft delete - message remains for other participants).

**Access:** Private (requires authentication)

**URL Parameters:**
- `messageId` (required): The ID of the message to delete

**Example Request:**
```
DELETE /api/v1/chat/messages/60d5ec49f1b2c72b8c8e4f23
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "msg": "Message deleted successfully"
}
```

---

### 7. Mark Conversation as Read

**Endpoint:** `PUT /api/v1/chat/conversations/:conversationId/read`

**Description:** Mark all messages in a conversation as read.

**Access:** Private (requires authentication)

**URL Parameters:**
- `conversationId` (required): The ID of the conversation

**Example Request:**
```
PUT /api/v1/chat/conversations/60d5ec49f1b2c72b8c8e4f1a/read
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "msg": "Conversation marked as read"
}
```

---

## Frontend Integration Examples

### 1. Fetch All Conversations

```javascript
const fetchConversations = async (token) => {
  const response = await fetch(`${API_BASE_URL}/api/v1/chat/conversations`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const conversations = await response.json();
  return conversations;
};
```

### 2. Create or Get Conversation

```javascript
const getOrCreateConversation = async (token, participantId) => {
  const response = await fetch(`${API_BASE_URL}/api/v1/chat/conversations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ participantId })
  });
  const conversation = await response.json();
  return conversation;
};
```

### 3. Fetch Messages

```javascript
const fetchMessages = async (token, conversationId, page = 1) => {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/chat/conversations/${conversationId}/messages?page=${page}&limit=50`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  const data = await response.json();
  return data;
};
```

### 4. Send Text Message

```javascript
const sendTextMessage = async (token, conversationId, content) => {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/chat/conversations/${conversationId}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content })
    }
  );
  const message = await response.json();
  return message;
};
```

### 5. Send Media Message

```javascript
const sendMediaMessage = async (token, conversationId, file, messageType, mediaDuration = null) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('messageType', messageType);
  if (mediaDuration) {
    formData.append('mediaDuration', mediaDuration);
  }

  const response = await fetch(
    `${API_BASE_URL}/api/v1/chat/conversations/${conversationId}/media`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    }
  );
  const message = await response.json();
  return message;
};
```

### 6. Send Audio Recording

```javascript
const sendAudioRecording = async (token, conversationId, audioBlob, duration) => {
  const file = new File([audioBlob], 'recording.mp3', { type: 'audio/mp3' });
  return await sendMediaMessage(token, conversationId, file, 'audio', duration);
};
```

---

## Database Models

### Conversation Model

```javascript
{
  participants: [ObjectId], // Array of User IDs
  lastMessage: ObjectId, // Reference to last Message
  lastMessageTime: Date,
  unreadCount: Map<String, Number>, // Map of userId -> unread count
  createdAt: Date,
  updatedAt: Date
}
```

### Message Model

```javascript
{
  conversation: ObjectId, // Reference to Conversation
  sender: ObjectId, // Reference to User
  messageType: String, // "text", "image", "video", "audio", "file"
  content: String, // For text messages
  mediaUrl: String, // For media messages
  mediaThumbnail: String, // For video thumbnails
  mediaSize: Number, // File size in bytes
  mediaDuration: Number, // Duration in seconds (audio/video)
  readBy: [ObjectId], // Array of User IDs who read the message
  deletedFor: [ObjectId], // Array of User IDs who deleted the message
  createdAt: Date,
  updatedAt: Date
}
```

---

## Error Handling

All endpoints return standard HTTP status codes:

- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Authentication required or failed
- `403 Forbidden`: Access denied
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

Example error response:
```json
{
  "msg": "Conversation not found"
}
```

---

## Notes

1. **Authentication**: All endpoints require a valid JWT token in the Authorization header.

2. **Pagination**: Messages are paginated with a default limit of 50 messages per page. Use the `page` and `limit` query parameters to navigate through messages.

3. **Auto-Read**: When fetching messages, unread messages are automatically marked as read for the current user.

4. **Unread Count**: The unread count is automatically updated when messages are sent or marked as read.

5. **Soft Delete**: Deleting a message only removes it for the current user. Other participants can still see the message.

6. **File Upload**: Media files are stored in the `uploads/chat` directory on the server.

7. **Message Types**: The system supports text, image, video, audio, and file messages.

8. **Real-time Updates**: For real-time messaging, consider implementing WebSocket or Socket.io on top of this REST API.

---

## Future Enhancements

- WebSocket/Socket.io integration for real-time messaging
- Message reactions (like, love, etc.)
- Message forwarding
- Voice/video call integration
- Group chat support
- Message search functionality
- Typing indicators
- Online/offline status

