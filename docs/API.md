# API Documentation

## Overview

The Thmanyah CMS provides a comprehensive RESTful API with Swagger/OpenAPI documentation, JWT authentication, and multi-tier rate limiting.

## API Access

### Base URLs

| Environment | URL | Description |
|-------------|-----|-------------|
| Development | `http://localhost:3000` | Local development server |
| Staging | `https://staging-api.thmanyah.com` | Staging environment |
| Production | `https://api.thmanyah.com` | Production API |

### Interactive Documentation

- **Swagger UI**: `/api`
- **OpenAPI JSON**: `/api-json`
- **Health Check**: `/health`

## Authentication

### JWT Token Flow

```
┌──────────┐      ┌──────────┐      ┌──────────┐
│  Client  │─────▶│   Login  │─────▶│   JWT    │
│          │◀─────│ Endpoint │◀─────│  Service │
└──────────┘      └──────────┘      └──────────┘
     │                                     │
     │         Access Token (15m)          │
     └─────────────────────────────────────┘
     │                                     │
     │        Refresh Token (7d)           │
     └─────────────────────────────────────┘
```

### Login

```bash
POST /auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "SecurePassword123!"
}

# Response
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 900
}
```

### Token Refresh

```bash
POST /auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

# Response
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 900
}
```

### Using Authentication

```bash
# Include token in Authorization header
GET /programs
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Public Discovery API

### Search Programs

Full-text search across published programs.

```bash
GET /discovery/search?q=programming&page=1&limit=20

# Query Parameters
- q: Search query (optional)
- page: Page number (default: 1)
- limit: Items per page (default: 20, max: 100)

# Response
{
  "data": [
    {
      "id": 1,
      "name": "Introduction to Programming",
      "description": "Comprehensive programming course",
      "language": "ENGLISH",
      "durationSec": 3600,
      "releaseDate": "2024-01-01T00:00:00.000Z",
      "mediaUrl": "https://cdn.example.com/video.mp4",
      "mediaType": "VIDEO",
      "category": {
        "id": 1,
        "name": "Technology",
        "description": "Tech courses"
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Browse Programs

Filter and browse published programs.

```bash
GET /discovery/browse?categoryId=1&language=ENGLISH&mediaType=VIDEO&page=1&limit=20

# Query Parameters
- categoryId: Filter by category (optional)
- language: ENGLISH or ARABIC (optional)
- mediaType: VIDEO or AUDIO (optional)
- page: Page number (default: 1)
- limit: Items per page (default: 20, max: 100)
```

### Get Program Details

```bash
GET /discovery/programs/1

# Response
{
  "id": 1,
  "name": "Introduction to Programming",
  "description": "Comprehensive programming course",
  "language": "ENGLISH",
  "durationSec": 3600,
  "releaseDate": "2024-01-01T00:00:00.000Z",
  "mediaUrl": "https://cdn.example.com/video.mp4",
  "mediaType": "VIDEO",
  "status": "PUBLISHED",
  "category": {
    "id": 1,
    "name": "Technology",
    "description": "Technology courses"
  },
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## Admin APIs (Authentication Required)

### Programs Management

#### Create Program

```bash
POST /programs
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Advanced TypeScript",
  "description": "Master TypeScript features",
  "language": "ENGLISH",
  "durationSec": 7200,
  "releaseDate": "2024-03-01T00:00:00.000Z",
  "mediaUrl": "https://cdn.example.com/typescript.mp4",
  "mediaType": "VIDEO",
  "status": "DRAFT",
  "categoryId": 1
}
```

#### List Programs

```bash
GET /programs?status=PUBLISHED&language=ENGLISH&page=1&limit=25
Authorization: Bearer <token>

# Query Parameters
- status: DRAFT, PUBLISHED, or ARCHIVED
- categoryId: Filter by category
- language: ENGLISH or ARABIC
- mediaType: VIDEO or AUDIO
- recent: Get N most recent programs
- page: Page number
- limit: Items per page (max: 100)
```

#### Update Program

```bash
PATCH /programs/1
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "PUBLISHED",
  "description": "Updated description"
}
```

#### Delete Program

```bash
DELETE /programs/1
Authorization: Bearer <token>
```

### Categories Management

#### Create Category

```bash
POST /categories
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Science",
  "description": "Scientific content",
  "isActive": true
}
```

#### List Categories

```bash
GET /categories?active=true
Authorization: Bearer <token>

# Query Parameters
- active: Filter by active status (optional)
```

### Employees Management

#### Create Employee

```bash
POST /employees
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "password": "SecurePass123!",
  "department": "Engineering",
  "position": "Senior Developer"
}
```

#### List Employees

```bash
GET /employees?active=true&department=Engineering
Authorization: Bearer <token>

# Query Parameters
- active: Filter by active status
- department: Filter by department
```

## Rate Limiting

### Rate Limit Tiers

| Tier | Endpoints | Limit | Window | Tracking |
|------|-----------|-------|--------|----------|
| **Public** | `/auth/*` | 100 req/min | 60s | Per IP |
| **Search** | `/discovery/*` | 30 req/min | 60s | Per IP |
| **Authenticated** | All admin endpoints | 1000 req/min | 60s | Per User |

### Rate Limit Headers

All responses include rate limit information:

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 25
X-RateLimit-Reset: 1640995200
X-RateLimit-Policy: search-rate-limit
```

### Rate Limit Response

When rate limit is exceeded:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60

{
  "statusCode": 429,
  "message": "Too many requests",
  "error": "Too Many Requests"
}
```

## Pagination

### Request Format

```bash
GET /programs?page=2&limit=25
```

### Response Format

```json
{
  "data": [...],
  "meta": {
    "page": 2,
    "limit": 25,
    "total": 150,
    "totalPages": 6
  }
}
```

### Pagination Parameters

| Parameter | Default | Maximum | Description |
|-----------|---------|---------|-------------|
| page | 1 | - | Page number (1-based) |
| limit | 20 | 100 | Items per page |

## Error Responses

### Standard Error Format

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Duplicate resource |
| 422 | Unprocessable Entity | Validation errors |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

## Import API

### Import from YouTube

```bash
POST /import/video
Authorization: Bearer <token>
Content-Type: application/json

{
  "videoId": "dQw4w9WgXcQ",
  "categoryId": 1
}
```

### Import Channel

```bash
POST /import/channel
Authorization: Bearer <token>
Content-Type: application/json

{
  "channelId": "UC_x5XG1OV2P6uZZ5FSM9Ttw",
  "sourceType": "YOUTUBE",
  "categoryId": 1
}
```

### Import by Source Type

```bash
POST /import/by-source-type
Authorization: Bearer <token>
Content-Type: application/json

{
  "sourceType": "RSS",
  "sourceUrl": "https://example.com/feed.xml",
  "categoryId": 1
}
```

## WebSocket Events (Future)

```javascript
// Connection
const socket = io('wss://api.thmanyah.com', {
  auth: { token: 'Bearer ...' }
});

// Subscribe to events
socket.on('program.created', (program) => {
  console.log('New program:', program);
});

socket.on('program.updated', (program) => {
  console.log('Program updated:', program);
});
```

## API Design Principles

### RESTful Architecture
- Resource-based URLs
- Standard HTTP methods (GET, POST, PATCH, DELETE)
- Consistent response formats
- HATEOAS-ready structure

### Performance Optimization
- Pagination on all list endpoints
- Field selection support
- Response compression
- ETag support for caching

### Developer Experience
- Interactive Swagger documentation
- Consistent error responses
- Comprehensive rate limit headers
- Request ID tracking

## Related Documentation

- [Architecture Overview](./ARCHITECTURE.md)
- [Security](./SECURITY.md)
- [Rate Limiting](./SECURITY.md#rate-limiting)
- [Configuration](./CONFIGURATION.md)