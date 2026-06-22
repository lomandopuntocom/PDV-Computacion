# Error Messaging Contract for API Tests

## Purpose

This document defines the required error messaging contract for the classroom API test.

The goal is not only to return the correct HTTP status code. The goal is to make errors predictable, safe, and easy to validate across Inventory, Sales, and Purchasing.

Every team should understand this distinction:

- An endpoint can document that it may return `404 Not Found`.
- The global exception handler returns a `404 ProblemDetails` response only when an exception is thrown and escapes the normal controller flow.

Those are related, but they are not the same thing.

## Why Use a Global Exception Handler?

A global exception handler is a single place where the API converts unhandled exceptions into safe HTTP responses.

Without it, each controller tends to write its own `try/catch` blocks and its own error shape. That creates inconsistent responses such as:

```json
{ "message": "Product not found" }
```

```json
"Invalid request"
```

```json
{ "error": "System.NullReferenceException..." }
```

For a contract test, this is difficult to validate because every endpoint may behave differently.

With a global exception handler, unexpected or escaped exceptions are converted into one common shape based on `ProblemDetails`.

Benefits:

- Controllers stay focused on normal request handling.
- Tests can assert one predictable error schema.
- Clients do not need endpoint-specific error parsing.
- Stack traces and internal class names are not exposed to users.
- Backend logs still keep the full exception.
- A `traceId` is returned so the client error can be matched with backend logs.

## Important Rule About 404 Responses

`404 Not Found` does not always mean the global exception handler was used.

There are two valid ways an API can return a `404`:

### 1. Exception-based 404

If application code throws a `KeyNotFoundException` and the exception reaches the global exception handler, the handler returns:

```http
HTTP/1.1 404 Not Found
Content-Type: application/problem+json
```

```json
{
  "status": 404,
  "title": "Recurso no encontrado",
  "detail": "La orden de compra no existe.",
  "instance": "/api/purchases/companies/ABC/orders/PO-001",
  "traceId": "00-..."
}
```

This is the error shape controlled by the global exception handler.

### 2. Manual controller 404

If a controller explicitly returns `NotFound(...)`, the response is created by the controller, not by the global exception handler.

Example:

```csharp
return NotFound(new { message = "Empresa no encontrada" });
```

That response may still have HTTP status `404`, but it is not automatically converted by the current global exception handler.

For this reason, when this document says "the global exception handler returns 404", it means:

> A `404 ProblemDetails` response is produced when an exception mapped to 404 escapes and is caught by the global exception handler.

It does not mean every possible `404` response in the API is produced by the handler.

## Required ProblemDetails Schema

For exception-based errors, the API must use the `ProblemDetails` shape.

Required JSON fields:

```json
{
  "status": 400,
  "title": "Operacion invalida",
  "detail": "The request cannot be completed.",
  "instance": "/api/example/path",
  "traceId": "00-..."
}
```

Field meaning:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `status` | number | Yes | HTTP status code returned by the API. |
| `title` | string | Yes | Short category of the error. |
| `detail` | string | Yes | Safe message that explains the problem. |
| `instance` | string | Yes | Request path where the error happened. |
| `traceId` | string | Yes | Identifier used to find the backend log entry. |

The response content type should be:

```http
application/problem+json
```

## Exception-to-Status Mapping

The global exception handler should map known exceptions to stable HTTP responses.

| Exception type | HTTP status | Meaning |
| --- | --- | --- |
| `KeyNotFoundException` | `404 Not Found` | A requested resource does not exist or cannot be found in the current context. |
| `ArgumentException` | `400 Bad Request` | The request contains invalid input. |
| `InvalidOperationException` | `400 Bad Request` | The request is understandable, but the operation is not valid in the current state. |
| `UnauthorizedAccessException` | `403 Forbidden` | The user is not allowed to perform the action. |
| Any other exception | `500 Internal Server Error` | Unexpected server error. The client receives a generic message. |

For unexpected `500` errors, never expose the raw exception message, stack trace, database details, file paths, or internal class names.

Recommended generic `500` detail:

```json
{
  "status": 500,
  "title": "Error interno del servidor",
  "detail": "Ocurrio un error inesperado. Intenta nuevamente o contacta a soporte.",
  "instance": "/api/example/path",
  "traceId": "00-..."
}
```

## Classroom Contract Rules

These rules should be followed for the test:

1. Every API must register a global exception handler.
2. Exception-based errors must return `ProblemDetails`.
3. `KeyNotFoundException` must produce `404 ProblemDetails` only when it escapes to the global exception handler.
4. Manual responses such as `NotFound(...)`, `BadRequest(...)`, or `Conflict(...)` are not automatically global-handler responses.
5. New contract endpoints should avoid inconsistent anonymous error shapes.
6. Error responses must not expose stack traces or internal exception details.
7. OpenAPI contracts should document a shared `ProblemDetails` schema for exception-based error responses.
8. Business conflicts may include extra fields, but they should keep the base ProblemDetails fields when returned as a standardized error.

## OpenAPI Recommendation

OpenAPI should include one reusable schema for exception-based errors.

Recommended schema name:

```yaml
ProblemDetails
```

Example OpenAPI component:

```yaml
components:
  schemas:
    ProblemDetails:
      type: object
      required:
        - status
        - title
        - detail
        - instance
        - traceId
      properties:
        status:
          type: integer
          format: int32
          example: 404
        title:
          type: string
          example: Recurso no encontrado
        detail:
          type: string
          example: La orden de compra no existe.
        instance:
          type: string
          example: /api/purchases/companies/ABC/orders/PO-001
        traceId:
          type: string
          example: 00-abc123
```

Example response reference:

```yaml
responses:
  "404":
    description: Resource not found.
    content:
      application/problem+json:
        schema:
          $ref: "#/components/schemas/ProblemDetails"
```

Important: this documents the standardized exception response. If an endpoint still returns a manual `NotFound(new { message = "..." })`, the implementation and OpenAPI contract must either be updated to match `ProblemDetails` or clearly document the manual response shape.

## Examples by Module

### Purchasing

If a purchase order does not exist and the use case throws:

```csharp
throw new KeyNotFoundException("La orden de compra no existe.");
```

Then the global exception handler should return:

```json
{
  "status": 404,
  "title": "Recurso no encontrado",
  "detail": "La orden de compra no existe.",
  "instance": "/api/purchases/companies/ABC/orders/PO-001",
  "traceId": "00-..."
}
```

### Inventory

If an inventory operation is invalid and throws:

```csharp
throw new InvalidOperationException("No existe stock suficiente.");
```

Then the global exception handler should return:

```json
{
  "status": 400,
  "title": "Operacion invalida",
  "detail": "No existe stock suficiente.",
  "instance": "/api/inventory/companies/ABC/stock/consume",
  "traceId": "00-..."
}
```

### Sales

If a sales endpoint requests a ticket that does not exist and throws:

```csharp
throw new KeyNotFoundException("Ticket no encontrado");
```

Then the global exception handler should return:

```json
{
  "status": 404,
  "title": "Recurso no encontrado",
  "detail": "Ticket no encontrado",
  "instance": "/api/sales/companies/ABC/tickets/T-001",
  "traceId": "00-..."
}
```

If the controller instead does this:

```csharp
return NotFound(new { message = "Ticket no encontrado" });
```

Then the response is a manual controller response. It has status `404`, but it is not produced by the global exception handler.

## Final Guidance

Using a global exception handler is the right direction. It gives the project one reliable rule for errors that escape the normal flow.

The important part is to be precise:

- `404` is an HTTP status.
- `ProblemDetails` is the standardized error body.
- The global exception handler returns `404 ProblemDetails` only for mapped exceptions, such as `KeyNotFoundException`, that escape to the handler.
- A manual `NotFound(...)` response is still a `404`, but it is not the same mechanism.

This precision makes the contract easier for classmates to follow and easier for tests to validate.
