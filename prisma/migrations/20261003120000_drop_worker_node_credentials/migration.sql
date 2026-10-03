-- Reverts 20261003100000_worker_node_credentials: device sign-in was dropped. Both columns were never populated.
ALTER TABLE "WorkerNode" DROP COLUMN "passwordHash",
DROP COLUMN "tokenVersion";
