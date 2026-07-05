# Security Policy

GL1TCH is a token-safety project — a tool that tells people what's safe has to be safe
itself. We take vulnerability reports seriously and welcome responsible disclosure.

## Reporting a vulnerability

**Please do not open a public issue for security problems.** Instead, use one of:

1. **GitHub private vulnerability reporting** (preferred) — the **Report a vulnerability**
   button under this repository's **Security** tab. This opens a private advisory only the
   maintainers can see.
2. **Telegram** — message the admins in [t.me/gl1tch_infected](https://t.me/gl1tch_infected)
   and ask to open a private security channel. Do not post details in public chat.

Please include: a description, reproduction steps, affected component (site / scanner / bot),
and impact. If you can, suggest a fix.

## Our commitment

- We aim to acknowledge a report within **72 hours** and to keep you updated on the fix.
- We will not take legal action against good-faith research that respects the scope below and
  does not harm users or their funds — a **safe harbor** for responsible disclosure.
- We will credit reporters (with permission) once a fix ships.

## Scope

**In scope:** the website (`coin-three-mu.vercel.app`), the scanner engine and its API,
and the Telegram bot.

**Out of scope / please don't:** anything that harms real users or funds — no testing against
other users' wallets, no denial-of-service against production, no social engineering of the
team or community, no automated scanning that degrades the service for others. Test against
your own accounts and local builds.

## Core security invariants (report any violation)

These are guarantees we enforce; a break in any of them is a valid, high-priority report:

- **We never request a fund-transfer or token-approval signature.** GL1TCH only ever asks for
  an ownership-proving *message* signature that moves nothing. A CI check blocks any such call.
- **Secrets never live in code.** A secret-leak scan (gitleaks) runs on every push.
- **Scoring is free and never gated** behind holding the token.

See [`docs/threat-model.md`](docs/threat-model.md) for our threat model, and
[the public Security & Transparency page](https://coin-three-mu.vercel.app/security).

## No paid bounty (yet)

We're an anonymous, self-funded project and do not run a paid bug-bounty program at this time.
Reports are rewarded with public credit and our genuine thanks. A funded program is on the
roadmap as the project grows.
