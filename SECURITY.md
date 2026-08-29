# Security Policy

## Reporting a vulnerability

Please report security vulnerabilities privately via
[GitHub security advisories](https://github.com/Greenhawk5/AliFaniani-Portfolio/security/advisories/new)
on this repository.

Please include a description of the issue, the steps to reproduce it, and the
affected route or file if known. Do not open a public issue for security
reports.

## Supported versions

Only the latest version deployed to production (`main` branch) is supported.

## Scope notes

- This is a static portfolio SPA hosted on Cloudflare Pages. There are no
  user accounts, sessions, or stored user data; the only interactive endpoint
  is the contact form.
- Do not test against the production contact endpoint in ways that send
  email or consume quotas. Validate against a local runtime instead
  (`npx wrangler pages dev dist`).
- Implemented hardening is documented in the
  [Security section of the README](README.md#security).
