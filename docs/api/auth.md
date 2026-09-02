# Authentication API

Base URL: `/api/v1`

## Register

`POST /auth/register`

```json
{
  "name": "Demo Customer",
  "email": "demo@example.com",
  "password": "Secure123"
}
```

Returns `201` with a safe Customer profile and access token. Extra fields, including `role`, are rejected. Duplicate email returns `409`; invalid input returns `422`.

## Login

`POST /auth/login`

```json
{
  "email": "demo@example.com",
  "password": "Secure123"
}
```

Returns `200` with a safe profile and access token. Invalid credentials return `401` without revealing which credential was wrong.

## Current user

`GET /auth/me`

Header: `Authorization: Bearer <access-token>`

Returns the current active user's safe profile. Missing, invalid, or expired credentials return `401`.
