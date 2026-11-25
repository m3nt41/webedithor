# Security policy

## Supported versions

WebEdiThor is early-stage software. Only the latest code on the `main` branch is supported.

## What counts as a security issue here

The editor runs entirely in your browser and has no server, accounts or network calls of its own, so the realistic risks are about **untrusted content**:

- **Importing JSON or an AI "plan"** (**Abrir JSON**, **Pegar plan o JSON**) that injects script or markup into the editor or into an export.
- **Exported HTML** that executes something the author did not write (XSS through text, links, image sources, styles or animation values).
- Anything that makes the editor read or send data you did not intend.

Import validation is covered by `tests/xss-import.mjs`. If you find a way around it, that is exactly what we want to hear about.

## How to report

Please **don't open a public issue** for a vulnerability.

Use GitHub's private reporting: go to the repository's **Security** tab and choose **Report a vulnerability**. Include what you did, what you expected, what happened, and (if possible) a minimal JSON that reproduces it.

You can expect a first answer within about a week. This is maintained by one person, so please be patient; fixes are credited unless you prefer otherwise.
