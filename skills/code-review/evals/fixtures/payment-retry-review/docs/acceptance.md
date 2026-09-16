# Agreed checkout acceptance

For this synthetic evaluation, one order identifies one immutable payment submission. Its amount is a positive integer number of cents. Reusing an order with a different amount is a contract error. A completed submission returns the same receipt on later calls. Distinct orders may have the same amount and must remain independent.

A timeout does not tell the caller whether the provider accepted the payment. Repeating a logical submission must not add a second charge, including after the provider persisted acceptance but its response was lost, after retry exhaustion, and after a process restart. Preserve the submission identity durably before a provider call. Provider idempotency is scoped to the submitted key and exact order/amount pair. It does not deduplicate distinct keys by order ID.

The new feature permits at most two attempts during a single invocation, and only for `PROVIDER_TIMEOUT`. Other provider errors propagate. A pending submission stays recoverable when the invocation fails. The caller may reopen its persisted state and retry later. This exercise uses sequential calls from one client; multi-worker concurrency, storage crash consistency, credentials, settlement and production throughput are outside its scope.

Review against the current contract and actual caller path. Do not infer coverage for timeout-after-acceptance or restarts from a check that only times out before acceptance.
