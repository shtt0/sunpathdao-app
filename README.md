# Sunpath DAO

## Overview

SUNPATH DAO uses Solana to crowdsource road condition reporting.  
Drivers earn SOL by videoing roads, helping lower maintenance costs,  
easily onboarding to crypto, and funding safer roads globally.

## Links

- **Demo:** https://sunpathdao.replit.app/
- **Deck:** https://docs.google.com/presentation/d/1Ap8eoM25E24VWcPOhb4LbQSWadRcGeJPXtDUto983AI/edit?usp=sharing
- **Presentation:** https://youtu.be/9RD47Yy2Jl4
- **Technical Video (LIVE DEMO):** https://youtu.be/w4f1quJ5J9c

# On-Chain Program `sunpath` Test Overview

This document outlines the summary of end-to-end tests performed on the Solana Devnet for the `sunpath` program (Program ID: `38E1zgevXVshKemafYmkJF1YvDJqG2NVzeX4TCYS8TbL`). Each test validates a specific user workflow and program instruction's behavior.

Transaction IDs are provided for reference and can be inspected on a Solana Devnet explorer (e.g., [https://explorer.solana.com/?cluster=devnet](https://explorer.solana.com/?cluster=devnet)).

## 0. Essential Initializations

These operations are prerequisites for running the other test workflows.

### a. Program Global Configuration Initialization (`initializeProgram`)

- **Purpose:** To initialize the global configuration account (`Config` PDA) used by the program. This includes settings such as the admin address, fee percentages, and penalty durations. Typically, this is executed once after the program deployment.
- **Workflow:**
  1. The designated admin (or program deployer) calls the `initializeProgram` instruction.
  2. A new `Config` PDA is created and initialized with the provided parameters.
- **Test Script:** Executed via the Solana Playground UI's test tab.
- **Key Verifications:** The `Config` account is created, and its settings are correctly populated.
  - _(Note: While a direct log for this instruction from the final test sequence is omitted for brevity, the existence and use of the Config PDA `4Rp93kN5mVhUdj2xoKJqW3rNLx584DbhARM91AZ7cYbg` in subsequent successful tests confirm its prior successful execution for this Program ID.)_

### b. Admin Action Counter Initialization (`initializeAdminCounter`)

- **Purpose:** To initialize an `AdminActionCounter` account (PDA) for a specific user (admin/consigner). This account tracks the number of tasks accepted or rejected by that user. It is created on a per-user basis.
- **Workflow:**
  1. A user calls the `initializeAdminCounter` instruction.
  2. A new `AdminActionCounter` PDA, seeded with the user's public key, is created. Its `accept_count` and `reject_count` are initialized to 0.
- **Test Script:** `test_step1_initialize_counter.js`
- **Key Verifications:** The `AdminActionCounter` account is created, and both counts are initialized to zero.
- **Example Run (for wallet `4A8gjRE...`):**
  - Transaction ID: `5tcNzA2EP7Knvt6yChQrQwoQk7BnZJQYCGXr7VyDjqkD5ne3XDyX3a5nFhbKrfmoNSKnCZffZoEsnkDzNRKAZpK7`

## 1. Task Creation and Acceptance Workflow

- **Purpose:** To test the complete flow from task creation and fund locking, to an admin accepting the task, the reward being transferred to a recipient, and the `accept_count` being incremented.
- **Workflow:**
  1. A `consigner` calls the `createTask` instruction, providing task details and locking SOL as a reward.
  2. A `TaskAccount` PDA is created with status `Open`, and the reward amount is locked into this PDA.
  3. An `admin` (the same wallet as the consigner in this test) calls the `acceptTask` instruction for the open task.
  4. The locked SOL is transferred from the `TaskAccount` PDA to the specified `recipient_account`.
  5. The `TaskAccount`'s status is updated to `Approved`.
  6. The admin's `AdminActionCounter.accept_count` is incremented.
- **Test Script:** `test_step2_accept_workflow.js`
- **Key Verifications:** Task status changes to `Approved`; `accept_count` increments correctly. The program logic handles the lamport transfer.
- **Example Run (for wallet `4A8gjRE...`):**
  - `createTask` Transaction ID: `5Sw4jCWQX9EkzB2yEEymDeRcZ7TszLaapwvS28TMdDxPQmjooNczaoXFh6TKaqpZMWriWguvKYxHFdXRKpF5kyWU`
  - `acceptTask` Transaction ID: `TAar9TRWi4Vo2BKBRMq3LmQgQGao3LBrCHjn6GpMEmayvzmL8DJuAXNZj7LVwg6UhbLqoNfoSUVs4wDuG2PdHBi`
  - Result: `acceptCount` incremented to `1`.

## 2. Task Creation and Rejection Workflow

- **Purpose:** To test the flow where a task is created and subsequently rejected by an admin, ensuring the `reject_count` is incremented.
- **Workflow:**
  1. A `consigner` calls the `createTask` instruction. A `TaskAccount` PDA is created (status: `Open`).
  2. An `admin` calls the `rejectTask` instruction for the open task.
  3. The `TaskAccount`'s status is updated to `Rejected`.
  4. The admin's `AdminActionCounter.reject_count` is incremented.
- **Test Script:** `test_step3_reject_workflow.js`
- **Key Verifications:** Task status changes to `Rejected`; `reject_count` increments correctly.
- **Example Run (for wallet `4A8gjRE...`, showing cumulative count increase):**
  - `createTask` Transaction ID: `4KPhkFp3NPksFKnaZNcHZLrFxBQnfcrR1Kjuz8TMRgn94PuCx8Srn17hhCPMJJAW3Z3K72nxdFhpmfPzRyqSLCTP`
  - `rejectTask` Transaction ID: `3bHNQJze7hci4qN9nnqs6fBkvCApxWo5xk61rAh5cQjd5rdyA31ifhvXzybU1RagMqJSach7pQBkPn1oktBrseBm`
  - Result: `rejectCount` (which was `3` before this specific test's `rejectTask` call due to prior tests in the session) incremented to `4`.

## 3. Reclaiming Funds from a Rejected Task Workflow

- **Purpose:** To test the ability of the original `consigner` to reclaim locked funds from a task that has been `Rejected`, after any `denial_penalty_duration` has passed.
- **Workflow:**
  1. A `consigner` creates a task (`createTask`).
  2. An `admin` rejects the task (`rejectTask`). The task status becomes `Rejected`.
  3. After the `denial_penalty_duration` (set to 1 second during program initialization for testing purposes) has elapsed, the original `consigner` calls the `reclaimTaskFunds` instruction.
  4. The locked SOL is transferred from the `TaskAccount` PDA back to the `consigner's` wallet.
  5. The `TaskAccount`'s status is updated to `Reclaimed`, and its `reward_amount_locked` is set to 0.
- **Test Script:** `test_step4_reclaim_workflow.js`
- **Key Verifications:** Task status changes to `Reclaimed`; `reward_amount_locked` becomes 0.
- **Example Run (for wallet `4A8gjRE...`):**
  - `reclaimTaskFunds` Transaction ID: `4qyWQz4e5rbn1HGAgfcq6ExpaVbgWKR4zNXWo19MUBYcUwTvPCFvichrQqsE5vjEUoJ8RvWzCfq5BK5kpaRXAMf`

## 4. Reclaiming Funds from an Expired Task Workflow

- **Purpose:** To test the ability of the original `consigner` to reclaim locked funds from a task that was `Open` but expired before being accepted or rejected. This action should not affect the admin action counters.
- **Workflow:**
  1. A `consigner` creates a task (`createTask`) with a very short `duration_seconds` (e.g., 0 seconds for testing).
  2. The task's expiration time passes.
  3. The original `consigner` calls the `reclaimTaskFunds` instruction.
  4. The locked SOL is transferred from the `TaskAccount` PDA back to the `consigner's` wallet.
  5. The `TaskAccount`'s status is updated to `Reclaimed`, and its `reward_amount_locked` is set to 0.
  6. The `AdminActionCounter` (`accept_count`, `reject_count`) associated with the consigner should remain unchanged by this operation.
- **Test Script:** `test_step5_expire_reclaim_workflow.js`
- **Key Verifications:** Task status changes to `Reclaimed`; `reward_amount_locked` becomes 0. The `accept_count` and `reject_count` on the consigner's `AdminActionCounter` remain unchanged from their values before this workflow.
- **Example Run (for wallet `4A8gjRE...`):**
  - `reclaimTaskFunds` Transaction ID: `oKNSY8tbCV2gr8JXWgWfY4QsHumBGCGDQtrxJuqet2Na8zdFYFjNXSYF3uSAsPzfDuWEkMtYijPTqJkzMEo19Qv`
  - Result: `acceptCount` (was `2`) and `rejectCount` (was `5`) remained unchanged after this test.

---

## Features

- Task creation and management
- Task approval and rejection
- Fund management and reclamation
- Solana wallet integration

## Tech Stack

### Frontend

- React
- TypeScript
- Tailwind CSS
- Vite

### Backend

- Solana
- Anchor Framework
- Rust

## Setup

1. Clone the repository

```bash
git clone https://github.com/shtt0/sunpathdao-app.git
cd sunpathdao-app
```

2. Install dependencies

```bash
npm install
```

3. Start development server

```bash
npm run dev
```

## Project Structure

```
src/
├── components/
│   ├── buttons/        # Action button components
│   └── common/         # Common components
├── hooks/             # Custom hooks
├── types/             # Type definitions
├── constants/         # Constants
└── pages/             # Page components
```

## Key Components

- `CreateTaskButton`: Create new tasks
- `AcceptTaskButton`: Approve tasks
- `RejectTaskButton`: Reject tasks
- `ReclaimTaskFundsButton`: Reclaim task funds

## Development Requirements

- Node.js v20.18.0 or higher
- Solana CLI
- Anchor Framework

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
