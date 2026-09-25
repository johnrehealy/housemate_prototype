-- Where the worker moves a job that has failed every retry, so one bad job
-- can't block or loop forever, and staff can see what failed and why.

select pgmq.create('inbound_messages_dead');

-- Queues are internal plumbing: browsers never reach them.
revoke all on all tables in schema pgmq from anon, authenticated;
