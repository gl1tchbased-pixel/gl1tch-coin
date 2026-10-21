// Locked test vectors for verdict anchoring v1. The site copy (src/lib/attest/vectors.ts) must stay identical:
// if either implementation changes its output, both test suites fail.
export const VECTORS = {
  records: [
    { chain: "solana", mint: "3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump", verdict: "LOW RISK", score: 88, scannedAt: 1792540800000 },
    { chain: "solana", mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", verdict: "CLEAN", score: 94, scannedAt: 1792540801000 },
    { chain: "ethereum", mint: "0x6982508145454ce325ddbe47a25d4ec3d2311933", verdict: "RUG-SHAPED", score: 31, scannedAt: 1792540802000 },
  ],
  canonical0:
    '{"v":1,"chain":"solana","mint":"3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump","verdict":"LOW RISK","score":88,"scannedAt":1792540800000,"engine":"gl1tch-scan-v1"}',
  leaf0: "1a3587de28889e901e4ebbff3a2f463dbdd3a7991b90b507573c48077c5c34c2",
  root: "e9fda9b865872a5754938ee41ecebb420ccf16b202a99f3e00c6e9f471479b94",
};
