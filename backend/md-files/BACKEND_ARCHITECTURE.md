# Backend Architecture

A reference for how this Node.js/Express backend is structured and why. The goal is a layered, scalable codebase where each part has a single clear responsibility.

Stack assumed throughout: **Express 5, Prisma 7, PostgreSQL**.

---

## The three-layer approach

A request should flow through clearly separated layers, each with one job:

```
Client  →  Route  →  Controller  →  Service  →  Repository (data layer)  →  Database
```

The naive version collapses this — a route hands off to a controller, and the controller talks to the database directly. That's fine for a throwaway pet project or a hackathon where you're racing the clock, but it doesn't scale and quickly turns controllers into dumping grounds for unrelated concerns.

The layered version keeps responsibilities clean:

| Layer | Responsibility | Should NOT |
|-------|---------------|------------|
| **Route** | Map an HTTP method + path to a controller | Contain logic |
| **Controller** | Parse the request, call a service, shape the response | Hold business logic or touch the DB |
| **Service** | All business logic, orchestration, calling other services/APIs | Know about HTTP (no `req`/`res`) |
| **Repository** | Encapsulate data access (Prisma queries) | Contain business rules |
| **Database** | Persistence | — |

### Why the separation matters

The controller's actual purpose is to **receive the request and send the response** — nothing more. Business logic belongs in services because:

- A single service can be reused by multiple controllers (and by other services, jobs, or event subscribers).
- Logic becomes testable in isolation without spinning up HTTP.
- Controllers stay thin and readable.

Consider creating an order. In a trivial app the controller might validate input and write to the DB in a few lines — no service needed. But the moment real logic appears, the controller gets bulky:

- Call a third-party server for order details
- Check the user has permission to create an order
- Verify the item is in inventory before shipping

That all belongs in a service, not a controller.

---

## A note on Prisma vs. the video's "model" layer

The original three-layer talk uses MongoDB/Mongoose, where the "model" layer holds predefined queries and the "schema" defines DB shape. With Prisma the mapping is slightly different:

- **Schema** → defined once in `prisma/schema.prisma`; Prisma generates a typed client. You do **not** hand-write per-model schema files.
- **Model / data layer** → becomes a **repository** pattern: thin modules that wrap Prisma calls so services never import `prisma` directly. This keeps the data-access boundary explicit and makes it swappable/mockable.

Some teams skip repositories and let services call Prisma directly. That's a legitimate trade-off for smaller apps — Prisma is already an abstraction over raw SQL. Add repositories when you want a hard seam between business logic and persistence (easier testing, the option to change ORM, or to centralise query reuse).

---

## Folder structure (single service)

```
src/
├── routes/             # HTTP method + path → controller
│   └── order.routes.ts
├── controllers/        # req/res handling only
│   └── order.controller.ts
├── services/           # business logic
│   └── order.service.ts
├── repositories/       # Prisma data-access wrappers
│   └── order.repository.ts
├── subscribers/        # event listeners (pub/sub)
│   └── order.subscriber.ts
├── events/             # event emitter setup + event names
├── middleware/         # auth, validation, error handling
├── utils/              # shared helpers
├── config/             # env loading, clients (prisma, logger)
└── app.ts              # express app wiring

prisma/
└── schema.prisma       # single source of truth for DB shape
```

### Request flow in practice

```
POST /orders
   └─ order.routes.ts        routes "POST /orders" → createOrder controller
        └─ order.controller  validates input, calls orderService.create()
             └─ order.service business logic (permissions, inventory, 3rd-party)
                  └─ order.repository  prisma.order.create(...)
                       └─ PostgreSQL
```

---

## Monorepo structure (multiple services)

For a monorepo with several microservices, each service mirrors the structure above, and shared code lives in publishable packages:

```
apps/
├── orders/             # full layered structure for the order service
│   └── src/...
└── payments/           # identical layout to orders
    └── src/...

libs/
└── logger/             # shareable package (publishable to npm)
                        # reused across all services
```

Anything reused across services — logging, common middleware, shared types — becomes a `libs/*` package you can version and publish.

---

## Pub/sub (the subscriber pattern)

Sometimes one action needs to trigger several unrelated reactions. When a user is created, you might need to send a welcome email, provision an account, and seed default settings — none of which the user-creation service should own directly.

Emit an event and let subscribers react:

- Keep all subscriptions for an entity in one file (e.g. `subscribers/user.subscriber.ts`) — one for `user.created`, one for `user.deleted`, etc.
- The originating service just emits; it doesn't know or care who's listening.
- This decouples side effects from core logic.

For anything that must survive a crash or needs retries, graduate from the in-process Node `EventEmitter` to a real queue (BullMQ/Redis, or a message broker). The in-process emitter is fine for fire-and-forget side effects within a single service.

---

## Testing

Match the test type to what you're protecting:

- **Unit tests** — for controllers and services. The bulk of your suite. Fast, isolated, mock the layer below.
- **Contract tests** — essential in a microservice architecture to guarantee that the request/response shape between services stays stable as they evolve independently.
- **Integration tests** — keep these few. Just enough to actually spin up the service(s) and verify real communication and data manipulation end-to-end.

The shape is a pyramid: many unit tests, fewer integration tests.

---

## Logging and monitoring

These are two distinct concerns — don't conflate them.

**Logging** captures what happened. It matters for debugging *and* for legal/audit purposes, so don't skip it. Use an established library rather than `console.log`:

- `Morgan` for HTTP request logging
- A structured logger like `Pino` or `Winston` for application logs

**Application monitoring** watches the running system: service health, performance, error tracking, alerting. Use a dedicated platform:

- Sentry, AppSignal, or Datadog

These are paid for organisations but worth it — they surface problems before users report them.

---

## Code quality

- Enable a **linter** (ESLint) and an autoformatter (Prettier).
- Run static analysis (e.g. **SonarQube**) to catch smells and maintainability issues.
- Adopt a **style guide** (Airbnb or Google) so the codebase stays consistent as the team grows.

---

## Summary

- One job per layer: route → controller → service → repository → DB.
- Controllers handle HTTP only; business logic lives in services.
- With Prisma, the data layer is a repository wrapping a generated client, not hand-written models.
- Decouple side effects with events/subscribers.
- Test in a pyramid; add contract tests between services.
- Log with intent (Morgan/Pino), monitor with a real platform (Sentry/Datadog).
- Enforce consistency with a linter and a style guide.
