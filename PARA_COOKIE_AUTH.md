# Para Cookie-Based Authentication Flow

This document describes the cookie-based authentication implementation using Para JWT tokens.

## Authentication Flow

1. **User opens the platform (frontend)**
   - Frontend initializes Para client

2. **Client checks if Para session is active** (frontend)
   ```typescript
   const isActive = await para.isSessionActive();
   ```

3. **If session is active, client calls `issueJwtAsync()`** (frontend)
   ```typescript
   const { token } = await para.issueJwtAsync();
   ```

4. **Client sends JWT to server**
   ```typescript
   POST /auth/set-cookie
   Body: { token: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..." }
   ```

5. **Server verifies and sets HTTP-only cookie**
   - Server validates JWT token using Para's JWKS
   - Server syncs user to database (creates if doesn't exist)
   - Server sets HTTP-only cookie named `para-jwt`

6. **All subsequent API requests automatically include the cookie**
   - Browser automatically sends cookie with every request
   - No need to manually add Authorization header

7. **Server reads JWT from cookie, verifies, and extracts user email**
   - `ParaJwtStrategy` extracts token from cookie
   - Validates token using JWKS
   - Extracts email from `payload.data.email`

8. **Server processes the request with the authenticated user's email**
   - User is synced to database
   - `internalUserId` is attached to request
   - Request proceeds with authenticated user

9. **If token expired, return 401**
   - Guard throws `UnauthorizedException` (401)
   - Client detects 401 and calls `issueJwtAsync()` again
   - Client sends new JWT to `/auth/set-cookie`
   - Cookie is updated and request retried

## Endpoints

### POST /auth/set-cookie
Sets the HTTP-only JWT cookie after validating the token.

**Request:**
```json
{
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "message": "Cookie set successfully"
}
```

**Errors:**
- `400 Bad Request`: Missing or invalid token
- `401 Unauthorized`: Expired or invalid JWT token

### POST /auth/logout
Clears the HTTP-only JWT cookie.

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

### GET /auth/me
Returns current user details (requires authentication via cookie).

**Response:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "isActive": true,
  ...
}
```

## Cookie Configuration

The JWT cookie is configured with:
- **Name**: `para-jwt`
- **httpOnly**: `true` (prevents JavaScript access)
- **secure**: `true` in production (HTTPS only)
- **sameSite**: `lax` (CSRF protection)
- **maxAge**: 30 minutes (matches Para JWT expiry)
- **path**: `/` (available for all routes)

## Client-Side Implementation

```typescript
// Initialize Para
const para = new Para('YOUR_PUBLIC_API_KEY');

// Check session and get JWT
async function authenticate() {
  const isActive = await para.isSessionActive();
  
  if (isActive) {
    const { token } = await para.issueJwtAsync();
    
    // Send token to server to set cookie
    await fetch('/auth/set-cookie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Important for cookies
      body: JSON.stringify({ token }),
    });
  }
}

// Make authenticated requests
async function fetchProtectedData() {
  const response = await fetch('/api/protected', {
    credentials: 'include', // Include cookie
  });
  
  if (response.status === 401) {
    // Token expired, refresh it
    await authenticate();
    // Retry request
    return fetch('/api/protected', { credentials: 'include' });
  }
  
  return response.json();
}

// Logout
async function logout() {
  await fetch('/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });
}
```

## Security Features

1. **HTTP-Only Cookies**: Prevents XSS attacks by making cookies inaccessible to JavaScript
2. **Secure Flag**: Ensures cookies are only sent over HTTPS in production
3. **SameSite**: Protects against CSRF attacks
4. **JWKS Verification**: Token signature is verified using Para's public keys
5. **Token Expiration**: Tokens expire after 30 minutes (configurable in Para)
6. **Automatic User Sync**: Users are automatically created/updated in database

## Token Refresh Flow

When a token expires:

1. Server returns `401 Unauthorized`
2. Client detects 401 status
3. Client checks if Para session is still active
4. If active, client gets new JWT via `issueJwtAsync()`
5. Client sends new JWT to `/auth/set-cookie`
6. Server updates cookie with new token
7. Client retries original request

## Database User Sync

When a JWT token is validated:
1. Email is extracted from `payload.data.email`
2. System checks if user exists by email
3. If user doesn't exist, creates new user
4. If user exists, updates `lastLogin` timestamp
5. If user is inactive, activates them
6. `internalUserId` (database ID) is attached to request

## CORS Configuration

CORS is configured to:
- Allow credentials (cookies)
- Support specified origins in production
- Allow all origins in development

Make sure frontend requests include `credentials: 'include'`:

```typescript
fetch('/api/endpoint', {
  credentials: 'include', // Required for cookies
});
```

## Troubleshooting

### Cookie Not Being Set
- Check CORS configuration includes `credentials: true`
- Verify frontend includes `credentials: 'include'` in fetch
- Check browser console for CORS errors
- Verify cookie domain/path settings

### 401 Unauthorized Errors
- Token may be expired - client should refresh
- Check Para session is still active
- Verify JWKS URL is correct
- Check token structure matches Para format

### User Not Found
- Check email extraction from token
- Verify user sync is working (check logs)
- Ensure database connection is working

## Migration from Header-Based Auth

If migrating from Authorization header:
1. Update frontend to use `/auth/set-cookie` endpoint
2. Remove manual Authorization header from requests
3. Add `credentials: 'include'` to all fetch calls
4. Update error handling to refresh tokens on 401

