# Para Integration - JWT Authentication

This document describes the Para JWT authentication integration that replaces the previous OTP and custom JWT authentication system.

## Overview

We're using **Para JWT Authentication** which provides:
- Stateless authentication using JWTs
- User email and identity in the token
- Session validation via JWKS (JSON Web Key Set)
- No per-request API calls (verification happens locally)

## Architecture

### Flow

1. **Client Side**: User logs in with Para (email authentication)
2. **Client Side**: Client calls `para.issueJwt()` to get a JWT token
3. **Client Side**: Client sends JWT in `Authorization: Bearer <token>` header
4. **Server Side**: `ParaJwtStrategy` verifies the JWT using Para's JWKS endpoint
5. **Server Side**: `ParaJwtAuthGuard` syncs user to database (creates if doesn't exist)
6. **Server Side**: Request proceeds with authenticated user

### Components

#### 1. Para JWT Strategy (`src/modules/auth/strategies/para-jwt.strategy.ts`)
- Verifies Para JWT tokens using JWKS
- Validates token structure and extracts user data
- Returns normalized payload with email and userId

#### 2. Para JWT Guard (`src/modules/auth/guards/para-jwt-auth.guard.ts`)
- Extends Passport's AuthGuard
- Calls `syncUserFromParaToken()` to ensure user exists in DB
- Attaches `internalUserId` to request for use in controllers

#### 3. Auth Service (`src/modules/auth/auth.service.ts`)
- `syncUserFromParaToken()`: Creates or updates user from Para token
- `verifyParaSession()`: Alternative verification using verification tokens (for non-JWT scenarios)

#### 4. Company Auth Guard (`src/modules/auth/guards/company-auth.guard.ts`)
- Extends `ParaJwtAuthGuard`
- Adds company validation after Para JWT authentication
- Uses `internalUserId` from Para JWT guard

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# Para Configuration
PARA_API_KEY=your_public_api_key          # Public API key for client-side
PARA_SECRET_API_KEY=your_secret_api_key   # Secret API key for server-side verification
PARA_ENVIRONMENT=beta                     # beta, sandbox, or prod
PARA_JWKS_URL=https://api.beta.getpara.com/.well-known/jwks.json  # Auto-set based on environment
PARA_VERIFY_URL=https://api.beta.getpara.com/sessions/verify      # For verification tokens
```

### JWKS URLs by Environment

- **SANDBOX**: `https://api.sandbox.getpara.com/.well-known/jwks.json`
- **BETA**: `https://api.beta.getpara.com/.well-known/jwks.json`
- **PROD**: `https://api.getpara.com/.well-known/jwks.json`

## Usage

### Protecting Endpoints

The default guard is now `ParaJwtAuthGuard`, so all endpoints are protected by default:

```typescript
@Controller('api')
export class MyController {
  @Get('protected')
  // Automatically protected by ParaJwtAuthGuard
  async getProtected(@CurrentUser() user: ParaJwtPayload & { internalUserId: number }) {
    // user.internalUserId - your database user ID
    // user.email - user's email from Para
    // user.data - full Para token data (wallets, authType, etc.)
    return { userId: user.internalUserId, email: user.email };
  }
}
```

### Public Endpoints

Use the `@Public()` decorator to make endpoints public:

```typescript
@Public()
@Get('public')
async getPublic() {
  return { message: 'This is public' };
}
```

### Company-Protected Endpoints

Use `@CompanyAuth()` decorator for endpoints that require company association:

```typescript
@CompanyAuth()
@Get('company-data')
async getCompanyData(@CurrentUser('withCompany') user: UserWithCompany) {
  return { companyId: user.company.id };
}
```

## Para JWT Token Structure

The Para JWT token contains:

```typescript
{
  sub: string;              // Para user ID (UUID)
  iat: number;              // Issued at timestamp
  exp: number;              // Expiration timestamp
  data: {
    userId: string;          // Para user ID
    email?: string;         // User email (for email auth)
    authType: string;       // 'email' | 'phone' | 'telegram' | etc.
    identifier: string;     // The identifier used (email, phone, etc.)
    wallets?: Array<{       // User's wallets
      id: string;
      type: 'EVM' | 'SOLANA';
      address: string;
    }>;
  }
}
```

## User Synchronization

When a Para JWT token is validated:
1. Email is extracted from the token
2. System checks if user exists in database by email
3. If user doesn't exist, creates new user with that email
4. If user exists, updates `lastLogin` timestamp
5. If user is inactive, activates them
6. `internalUserId` (database ID) is attached to the request

## Migration Notes

### What's Changed

- ✅ Default guard is now `ParaJwtAuthGuard` (was `JwtAuthGuard`)
- ✅ `CompanyAuthGuard` now extends `ParaJwtAuthGuard`
- ✅ `@CurrentUser()` decorator works with Para JWT payload
- ✅ User sync happens automatically on authentication

### What's Still There (Can Be Removed Later)

- `JwtAuthService` - Old JWT service (can be removed if not used elsewhere)
- `OtpService` - OTP service (can be removed)
- `JwtStrategy` - Old JWT strategy (can be removed)
- `JwtAuthGuard` - Old JWT guard (kept for backward compatibility if needed)

### Endpoints

- ✅ `GET /auth/me` - Works with Para JWT
- ✅ `POST /auth/verify-session` - Alternative verification using verification tokens
- ❌ `POST /auth/send-otp` - Can be removed (Para handles this)
- ❌ `POST /auth/verify-otp` - Can be removed (Para handles this)
- ❌ `POST /auth/refresh` - Can be removed (Para JWT handles expiry)
- ❌ `POST /auth/logout` - Can be removed (Para handles session management)

## Testing

### Client-Side Example

```typescript
// Client-side (React/Next.js)
import { Para } from '@getpara/react';

const para = new Para('YOUR_PUBLIC_API_KEY');

// User logs in with Para
await para.signIn({ method: 'email', email: 'user@example.com' });

// Get JWT token
const { token } = await para.issueJwt();

// Use token in API calls
fetch('/api/protected', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Verification Token Alternative

If you need to verify sessions without importing the full session:

```typescript
// Client-side
const verificationToken = await para.getVerificationToken();

// Server-side
POST /auth/verify-session
Body: { verificationToken: "..." }
```

## Troubleshooting

### Token Validation Fails

- Check that `PARA_JWKS_URL` is correct for your environment
- Verify the token is not expired
- Ensure the token is sent in `Authorization: Bearer <token>` header

### User Not Found

- Check that email is present in Para token
- Verify user sync is working (check logs)
- Ensure database connection is working

### Company Not Found

- Verify user has a team membership
- Check `CompanyAuthGuard` is being used correctly
- Ensure company service is working

## Next Steps

1. ✅ Para JWT authentication implemented
2. ✅ User synchronization working
3. ⏳ Remove old OTP endpoints (optional)
4. ⏳ Remove old JWT services (optional)
5. ⏳ Update frontend to use Para authentication
6. ⏳ Test end-to-end authentication flow

