# Changelog

All notable changes to this project will be documented in this file.

### [0.0.3](https://github.com/dave19109/repository-core/compare/v0.0.2...v0.0.3) (2026-03-30)

### 0.0.2 (2026-03-30)

### Features

- add lock() method to QueryBuilder for pessimistic locking ([0db4608](https://github.com/dave19109/repository-core/commit/0db46087e1636d08c76eefeaad893a2306bfee95))
- add LockMode type and lock field to QueryModel ([dc2b8d9](https://github.com/dave19109/repository-core/commit/dc2b8d90067dc7024546777bc874ba258944ef1c))
- add OptimisticLockConflictError and TransactionError classes ([bd76d3e](https://github.com/dave19109/repository-core/commit/bd76d3e9b1a610cc593ef4b5bd1a28b41601471d))
- add RetryPolicy and withRetry utility with linear/exponential backoff ([7c05288](https://github.com/dave19109/repository-core/commit/7c05288931585fdc4456ef26a3aa0530cbca9754))
- add runInTransaction cross-repo utility and export concurrency types ([5aeebcd](https://github.com/dave19109/repository-core/commit/5aeebcdba2b74e8ce0a0a8c283b957a19d20d93b))
- add structured repository error classes and wrap ORM operations ([3cec8bf](https://github.com/dave19109/repository-core/commit/3cec8bfecdd9d433e8a61e2e609fc12467608d24))
- add withTransaction and withTrx to ObjectionRepository with retry support ([cb53178](https://github.com/dave19109/repository-core/commit/cb5317852973f95bc39ed549d2ede53751f53584))
- add withTrx and getKnex to ObjectionClient, thread transaction through all queries ([03cbd66](https://github.com/dave19109/repository-core/commit/03cbd66ab3eb2789dc2e3fa81f22add40ed552c6))
- apply forUpdate/forShare in ObjectionQueryConverter for pessimistic locking ([8b14637](https://github.com/dave19109/repository-core/commit/8b14637f612bbf443603ae0125516f15169ab5b8))
- implement optimistic locking in ObjectionClient.update() via versionField ([fabb18f](https://github.com/dave19109/repository-core/commit/fabb18f5e219fdcc989f68591ae7084c39249080))

### Bug Fixes

- test ([239262b](https://github.com/dave19109/repository-core/commit/239262ba51c456fd5ddc06b69d021aafbe8a1d97))
- wrap serialization errors in withTransaction and add version WHERE on query path ([90fa12d](https://github.com/dave19109/repository-core/commit/90fa12d516b752b231afd843a4b42c19df6f8d3e))

### Docs

- add concurrency design spec for ObjectionClient ([66b70a5](https://github.com/dave19109/repository-core/commit/66b70a5cbd4ac156bc664c677167462a8d624040))

### Others

- add .worktrees to .gitignore ([40b8ec9](https://github.com/dave19109/repository-core/commit/40b8ec9b76ee0744cd0e84e6f1359f76a7b0fcfe))
- add Claude Code configuration and memory files ([5d007d7](https://github.com/dave19109/repository-core/commit/5d007d72a08897cba27d40bd3268c39640476e51))
- add race condition ([36a77b2](https://github.com/dave19109/repository-core/commit/36a77b2b2b1a1ad33018d91f5c3181a047bf3f40))
- initialize ([73d97aa](https://github.com/dave19109/repository-core/commit/73d97aace1c06896e6555b2ed72d476996cabd74))
- initialize ([53acdf0](https://github.com/dave19109/repository-core/commit/53acdf045f9a199ab10cd43c935203a3ed0bc692))

### 0.0.1 (2026-03-30)

### Features

- add lock() method to QueryBuilder for pessimistic locking ([0db4608](https://github.com/dave19109/repository-core/commit/0db46087e1636d08c76eefeaad893a2306bfee95))
- add LockMode type and lock field to QueryModel ([dc2b8d9](https://github.com/dave19109/repository-core/commit/dc2b8d90067dc7024546777bc874ba258944ef1c))
- add OptimisticLockConflictError and TransactionError classes ([bd76d3e](https://github.com/dave19109/repository-core/commit/bd76d3e9b1a610cc593ef4b5bd1a28b41601471d))
- add RetryPolicy and withRetry utility with linear/exponential backoff ([7c05288](https://github.com/dave19109/repository-core/commit/7c05288931585fdc4456ef26a3aa0530cbca9754))
- add runInTransaction cross-repo utility and export concurrency types ([5aeebcd](https://github.com/dave19109/repository-core/commit/5aeebcdba2b74e8ce0a0a8c283b957a19d20d93b))
- add structured repository error classes and wrap ORM operations ([3cec8bf](https://github.com/dave19109/repository-core/commit/3cec8bfecdd9d433e8a61e2e609fc12467608d24))
- add withTransaction and withTrx to ObjectionRepository with retry support ([cb53178](https://github.com/dave19109/repository-core/commit/cb5317852973f95bc39ed549d2ede53751f53584))
- add withTrx and getKnex to ObjectionClient, thread transaction through all queries ([03cbd66](https://github.com/dave19109/repository-core/commit/03cbd66ab3eb2789dc2e3fa81f22add40ed552c6))
- apply forUpdate/forShare in ObjectionQueryConverter for pessimistic locking ([8b14637](https://github.com/dave19109/repository-core/commit/8b14637f612bbf443603ae0125516f15169ab5b8))
- implement optimistic locking in ObjectionClient.update() via versionField ([fabb18f](https://github.com/dave19109/repository-core/commit/fabb18f5e219fdcc989f68591ae7084c39249080))

### Bug Fixes

- wrap serialization errors in withTransaction and add version WHERE on query path ([90fa12d](https://github.com/dave19109/repository-core/commit/90fa12d516b752b231afd843a4b42c19df6f8d3e))

### Docs

- add concurrency design spec for ObjectionClient ([66b70a5](https://github.com/dave19109/repository-core/commit/66b70a5cbd4ac156bc664c677167462a8d624040))

### Others

- add .worktrees to .gitignore ([40b8ec9](https://github.com/dave19109/repository-core/commit/40b8ec9b76ee0744cd0e84e6f1359f76a7b0fcfe))
- add Claude Code configuration and memory files ([5d007d7](https://github.com/dave19109/repository-core/commit/5d007d72a08897cba27d40bd3268c39640476e51))
- add race condition ([36a77b2](https://github.com/dave19109/repository-core/commit/36a77b2b2b1a1ad33018d91f5c3181a047bf3f40))
- initialize ([73d97aa](https://github.com/dave19109/repository-core/commit/73d97aace1c06896e6555b2ed72d476996cabd74))
- initialize ([53acdf0](https://github.com/dave19109/repository-core/commit/53acdf045f9a199ab10cd43c935203a3ed0bc692))
