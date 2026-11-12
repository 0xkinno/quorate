# Disclosures

- **AI used to build.** Claude Code (Anthropic) helped write code, tests and documents. Every commit is
  authored by 0xkinno, who directed the work, made the account and product decisions, and approved
  each PayPal sandbox setup step.
- **AI in the product.** Google Gemini (`gemini-3-flash-preview`) through the Vercel AI SDK: the Reader
  (vendor quotes and parent replies into typed JSON), the Scribe (slip notes in English, Spanish and
  Vietnamese) and the Clerk (help desk with read-only PayPal Agent Toolkit tools). No model ever decides
  an amount or calls a PayPal tool that moves money.
- **Demo people and places.** Ms. Ana Rivera, Harbor View Elementary, Bayline Coaches, Harbor Science
  Museum and every child and family named in the app are fictional. They are labelled "demo" on screen.
  The teacher spending figures and PayPal's Money Pools history are real and cited.
- **Sandbox only.** Every PayPal call goes to `api-m.sandbox.paypal.com`. Scripted runs place holds from
  one sandbox buyer's saved wallet, approved once by a person; the family slip uses a PayPal login per hold.
- **Prior work.** None. The repository was started on 12 Nov 2026 for this event. No part was submitted
  to another event.
- **Counterfactual.** `docs/counterfactual.json` is a seeded model of outcomes, not a measurement.
