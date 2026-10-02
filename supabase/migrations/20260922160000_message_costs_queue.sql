-- What a text cost is looked up after the fact: Twilio fills a message's price
-- in some time after it handles it, so the price is fetched by a job rather
-- than read from the status callback, which never carries it.

select pgmq.create('message_costs');
select pgmq.create('message_costs_dead');

-- Queues are internal plumbing: browsers never reach them.
revoke all on all tables in schema pgmq from anon, authenticated;
