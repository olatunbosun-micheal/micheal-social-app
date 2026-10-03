# AGENTS.md

## Project: Personal Communication Gateway

You are building a production-quality private communication PWA.

Read this entire document before writing code.

The product is NOT a social network.

The core architecture is:

```text
                    OWNER
                      │
          ┌───────────┼───────────┐
          │           │           │
        USER A      USER B      USER C
          │           │           │
       PRIVATE     PRIVATE     PRIVATE
        CHAT        CHAT        CHAT
```

Every user can communicate with the owner.
No user can communicate with another user.

---

# 1. Development Principles

Prioritize:
1. Security
2. Correct authorization
3. Data privacy
4. Real-time reliability
5. Mobile UX
6. Accessibility
7. Maintainability
8. Performance
9. Clean architecture
10. Simple implementation

Do not sacrifice authorization for convenience.
Do not implement security only in the frontend.

---

# 2. Before Coding

Before implementing features:
1. Inspect the existing repository.
2. Determine whether a project already exists.
3. Identify the framework and package manager.
4. Inspect existing configuration files.
5. Inspect environment configuration.
6. Inspect database configuration.
7. Inspect authentication configuration.
8. Reuse existing infrastructure where appropriate.
9. Do not overwrite existing work unnecessarily.
10. Create a clear implementation plan.

---

# 3. Recommended Stack

- Frontend: React / Next.js / Vite, TypeScript, Tailwind CSS, Lucide icons, PWA support
- Audio: Web Audio API & MediaRecorder for realistic voice messaging
- State: Reactive stores / Context with optimistic UI updates and local persistence
- Mobile-first responsive UI with WhatsApp/Telegram feel
