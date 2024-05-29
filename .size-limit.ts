import type { SizeLimitConfig } from "size-limit";

export default [
  {
    path: "dist/index.js",
    name: "history-adapter",
  },
  {
    path: "dist/index.cjs",
    name: "history-adapter (CJS)",
  },
  {
    path: "dist/redux.js",
    name: "history-adapter/redux",
  },
  {
    path: "dist/index.js",
    import: "{ createHistoryAdapter }",
    name: "import { createHistoryAdapter } from 'history-adapter'",
  },
  {
    path: "dist/index.js",
    import: "{ createPatchHistoryAdapter }",
    name: "import { createPatchHistoryAdapter } from 'history-adapter'",
  },
  {
    path: "dist/redux.js",
    import: "{ createHistoryAdapter }",
    name: "import { createHistoryAdapter } from 'history-adapter/redux'",
  },
  {
    path: "dist/redux.js",
    import: "{ createPatchHistoryAdapter }",
    name: "import { createPatchHistoryAdapter } from 'history-adapter/redux'",
  },
] satisfies SizeLimitConfig;
