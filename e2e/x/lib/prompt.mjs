// Minimal stdin gate. The campaign loop advances ONLY when the human presses
// Enter — this is the mechanism that keeps a human in the loop before every send.
import readline from 'node:readline';

/**
 * Ask a question on stdin and resolve with the trimmed answer.
 * @param {string} msg
 * @returns {Promise<string>}
 */
export function ask(msg) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(msg, (answer) => {
      rl.close();
      resolve((answer || '').trim());
    });
  });
}

// Small helper for human-paced randomized waits during scraping.
export function jitter(min = 1200, max = 2000) {
  return min + Math.floor(Math.random() * (max - min));
}
