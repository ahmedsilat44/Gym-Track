---
version: 1
slug: "src-pages-featureboard-jsx"
primary_target: "src/pages/FeatureBoard.jsx"
related_targets: ["src/pages/Login.jsx","src/pages/Admin.jsx"]
---

# Public feature board

- Scope: `#/features`, login preview, and administrator moderation queue.
- Visitor mode: Operate.
- Audience: signed-out visitors, current athletes, and community administrators.
- Job: inspect approved ideas, submit one bounded request, and understand that publication requires review.
- Primary action: submit a feature request for administrator review.
- Content proof: real approved requests and their Open, Planned, or Shipped state; no synthetic requests.
- Constraints: mobile-browser-first; usable without authentication; submitter name and email remain admin-only; pending and rejected requests never render publicly; direct database table access stays revoked.
- Direction: a public roadmap wall inside Spotter's midnight instrumentation system. Published request rows lead; compact submission panel supports on desktop and follows the board on mobile.
- Memorable moment: large “Help shape Spotter” invitation resolves immediately into a transparent review promise and visible public lanes.
- Unresolved: anonymous abuse protection beyond bounded database validation and client honeypot may need server-side CAPTCHA or rate limiting if traffic grows.
