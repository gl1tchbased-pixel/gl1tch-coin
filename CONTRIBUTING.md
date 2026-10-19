# Contributing to GL1TCH

Thanks for helping make token scams easier to spot. Issues and pull requests are welcome.

## Good first contributions

- **False positive or false negative?** Open an issue with the token address, the chain, the
  verdict you got and what you expected. Real examples are how the checks get better.
- **A new check.** Describe the on-chain signal, where the data comes from, and how it should
  score. Checks live in `src/lib/scan.ts` (Solana) and `src/lib/scan-multichain.ts` (EVM).
- **Docs and translations** for the API (`public/llms.txt`, the README).

## Ground rules

1. **Read-only, always.** Nothing in this repo may request a transaction or approval signature,
   hold keys, or move funds. CI greps for forbidden calls and will fail the PR.
2. **Safety is free.** Scanner features are never gated behind holding a token.
3. **Every scoring change is logged.** If you add a check or change a weight or threshold, add a
   line to [`docs/scoring-changelog.md`](./docs/scoring-changelog.md) in the same PR.
4. **Probabilistic, never accusatory.** Explanations say what a pattern means ("liquidity is not
   locked, so the dev can pull it"), not "this is a scam".
5. **No secrets in commits.** Use `.env.local` (see `.env.example`); it is gitignored.

## Development

```bash
npm install
npm run dev        # site at http://localhost:3000
npm test           # site unit tests
npx tsc --noEmit   # type-check
cd bot && npm install && npm test
```

Put pure logic (thresholds, parsers, formatting) in small modules with a `*.test.ts` next to
them, as `src/lib/deployer-holdings.ts` does.

## Security issues

Please don't open a public issue. Follow [`SECURITY.md`](./SECURITY.md).

By contributing you agree that your contributions are licensed under the [MIT License](./LICENSE).
