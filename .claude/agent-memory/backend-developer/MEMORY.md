# Backend Developer Agent Memory

## Project
- [Async I/O migration](project_async_io.md) -- All server services use fs/promises as of D2 Phase 2. Slug generation uses SHA-256 hashes. CORS middleware added.
- [tsconfig noEmit inheritance](project_tsconfig_noemit.md) -- base tsconfig.json has noEmit:true; tsconfig.server.json must override with noEmit:false or nothing emits to dist/server/.
