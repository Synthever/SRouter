# SRouter Throughput Benchmark

- Date: 2026-10-15T05:58:55Z
- Host: 4 cores / 7564MB RAM
- k6: k6 v0.49.0 (commit/b5328aa782, go1.21.6, linux/amd64)
- Workload: mixed (50% streaming chat, 40% buffered chat, 10% /v1/models)
- Upstream: local fake (isolated instance, temp DB, no real provider)
- Connection reuse: yes (connections reused)

| Target (req/s) | Delivered (req/s) | Failed | p(50) | p(90) | p(95) |
|---:|---:|---:|---:|---:|---:|
| 200 | 107.957535 | 20.08% | 1.73ms | 1.96ms | 2.11ms |
| 500 | 286.913998 | 15.39% | 1.7ms | 1.94ms | 2.38ms |
| 1000 | 537.645273 | 31.86% | 1.4ms | 3.34ms | 4.22ms |
| 1667 | 857.557411 | 42.93% | 1.75ms | 4.28ms | 5.57ms |

> Failure = connection-level reset (k6 status 0), not an HTTP error, when the
> accept loop or the 5-connection SQLite write pool is saturated. See
> issue #157 for the tuning plan (auth cache, pool sizing, upstream semaphore,
> decoupled log writer).
