# Security policy

## Supported versions

Only the `main` branch, which carries the latest release, receives fixes. Older releases are not patched.

## Reporting a vulnerability

**Do not open a public issue.** Use the repository's **Security** tab and select
**Report a vulnerability**, which opens a private advisory visible only to the
maintainers.

If possible, include:

- the affected version or commit;
- steps to reproduce;
- the expected impact (data leak, authentication bypass, etc.);
- a suggested fix, if you have one.

Initial response within 7 days. If the report is accepted, the fix is published to
`main` and the advisory is disclosed after deployment.

## Scope

In scope:

- authentication, JWT issuing and validation (`/auth/*`);
- authorization of the `/applications` routes;
- data exposure through the API;
- CORS configuration, security headers, and the ingress proxy;
- SQL injection, XSS, and CSRF in the web application;
- secrets committed by mistake.

Out of scope:

- social engineering and phishing;
- denial of service and flooding;
- scanner-only reports without proof of impact;
- vulnerabilities in dependencies without a CVE applicable to how the project uses them;
- trade-offs already documented in "Decisions and known limitations" in the README
  (in-memory login rate limit, no roles or account sharing, guard database lookup on every request).

## Practices in place

- Passwords compared in constant time, with a limit of attempts per window.
- JWTs signed with HMAC-SHA256, with `iss`/`aud` validated and a maximum TTL of 30 days.
- `ValidationPipe` with `whitelist` and `forbidNonWhitelisted`.
- Security headers applied in the API; restrictive CSP outside `/docs`.
- Database port published only on `127.0.0.1`.
- Dependabot and secret scanning enabled in the repository.
