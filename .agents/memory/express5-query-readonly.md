---
name: Express 5 req.query read-only
description: req.query is a read-only getter in Express 5; assigning to it throws TypeError
---

In Express 5, `req.query` is defined as a getter-only property on `IncomingMessage`. Attempting `req.query = result.data` throws `TypeError: Cannot set property query of #<IncomingMessage> which has only a getter`.

**Why:** Express 5 changed query parsing internals vs Express 4.

**How to apply:** In the `validate` middleware, skip mutation when `source === "query"`. Only mutate `req.body` and `req.params`.

```ts
if (source !== "query") {
  (req as unknown as Record<string, unknown>)[source] = result.data;
}
```
