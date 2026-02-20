# Session Policy

This document defines the active token/session policy for the MVP.

## Token Lifecycle

- Access token expiry is controlled by `JWT_EXPIRES_IN`.
- Refresh token expiry is controlled by `JWT_REFRESH_EXPIRES_IN`.
- On login, server returns both access and refresh tokens.
- On refresh, server rotates both tokens and returns a new pair.

## Client Behavior

- Client stores access and refresh tokens locally.
- Protected API calls include `Authorization: Bearer <accessToken>`.
- If a protected call returns `401`, client attempts one refresh via `/api/auth/refresh`.
- If refresh succeeds, client retries the original request once.
- If refresh fails, client clears both tokens.

## Logout Behavior

- Client calls `/api/auth/logout` and clears local tokens.
- Logout endpoint is idempotent and always returns success.

## API Auth Error Contract

Protected endpoints return `401` with one of:

- `code: AUTH_REQUIRED` when no bearer token is provided
- `code: TOKEN_EXPIRED` when access token is expired
- `code: TOKEN_INVALID` when access token is malformed or invalid

Refresh endpoint returns:

- `400` with `code: REFRESH_REQUIRED` when refresh token is missing
- `401` with `code: REFRESH_INVALID` when refresh token is invalid or expired
- `401` with `code: REFRESH_USER_NOT_FOUND` when token user no longer exists

## Operational Notes (Photo Upload)

- Photo upload uses browser direct `PUT` to a pre-signed S3 URL.
- CSP must allow outbound `connect-src` to S3 endpoints (for upload requests).
- S3 bucket CORS must allow the app origins (for local dev and preview domains).
- Required S3 env values must be real credentials (not placeholders):
	- `S3_ENDPOINT`
	- `S3_BUCKET`
	- `S3_ACCESS_KEY_ID`
	- `S3_SECRET_ACCESS_KEY`
	- `S3_REGION`

If upload fails with browser `CORS` or `Failed to fetch`, verify bucket CORS first, then credential validity.