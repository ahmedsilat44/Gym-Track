# Security policy

## Supported version

Security fixes are applied to the latest commit on the `main` branch.

## Reporting a vulnerability

Please do not open a public issue containing an exploit, credential, private user data, or another sensitive detail.

Use the repository's **Security** tab to open a private security advisory. Include:

- the affected page, file, table, or RLS policy;
- steps to reproduce the issue;
- the impact you observed;
- a minimal proof of concept with secrets and personal data removed; and
- a suggested fix, if you have one.

If private advisories are unavailable on a fork, contact that fork's maintainer privately. Do not send Supabase secret keys, service-role keys, database passwords, access tokens, or session tokens in a report.

## Credential exposure

This frontend only needs a Supabase **publishable** key. Publishable keys are designed for public clients and do not grant elevated database access. Security is enforced by Supabase Auth and PostgreSQL Row Level Security.

Never use or commit any of the following:

- a Supabase secret key (`sb_secret_...`);
- a legacy Supabase `service_role` JWT;
- a database password or connection string;
- a GitHub personal access token; or
- another user's access or refresh token.

If an elevated credential is exposed, revoke or rotate it immediately in the relevant provider, remove it from the current tree, and follow the provider's guidance for remediating Git history.
