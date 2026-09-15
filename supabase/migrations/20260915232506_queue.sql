-- Job queue for the agent worker. pgmq keeps jobs in Postgres, so a job is
-- only queued if the transaction that created it commits.

create extension if not exists pgmq;

select pgmq.create('inbound_messages');

-- Queues are internal plumbing: browsers never reach them.
revoke all on all tables in schema pgmq from anon, authenticated;
revoke all on schema pgmq from anon, authenticated;
