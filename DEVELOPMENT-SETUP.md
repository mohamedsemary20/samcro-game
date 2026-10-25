# Development setup

The verified local setup, exact npm scripts, PostgreSQL workflow, integration-test safety, and current product limitations are documented in the root [README](README.md). This file is intentionally a short pointer so environment notes do not drift from the main instructions.

Keep `server/.env` and `web/.env` local. Copy the corresponding `.env.example` only when the target file does not already exist. Use a development database for normal work and a separate disposable database named `samkaro_dev` for `npm.cmd run test:integration` from `server/`.

The test-question pool must remain explicitly opt-in, limited to development, and pointed at `samkaro_dev`. Production question records and approval status are outside the scope of routine frontend or gameplay work.
