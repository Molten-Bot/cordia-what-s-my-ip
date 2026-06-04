# Cordia Public IP API

Consumer contract for `/api/v1/*` endpoints.

Machine-readable OpenAPI definition: [`openapi.yml`](./openapi.yml)

## Base URL

Use the same origin that serves the application.

```text
https://example.com
```

## Authentication

No authentication is required.

## Endpoints

### `GET /api/v1/get`

Returns the public IP address detected for the caller.

#### Request

No query parameters or request body.

```sh
curl https://example.com/api/v1/get
```

#### Response

Status: `200 OK`

Header:

```text
Cache-Control: no-store
```

Body:

```json
{
  "ip": "203.0.113.10"
}
```

When the caller IP cannot be detected, the endpoint returns:

```json
{
  "ip": "Unknown"
}
```

#### Response Schema

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `ip` | string | yes | Public IPv4 or IPv6 address detected for the request, or `Unknown`. |

## Versioning

Endpoints under `/api/v1/*` are versioned as `v1`. Breaking response-shape changes should use a new version path.
