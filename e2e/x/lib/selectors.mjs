// Centralized X (Twitter) DOM selectors. X churns its markup periodically, so
// keeping every selector here makes recovery a one-file fix.
//
// SAFETY INVARIANT: this file intentionally contains NO send-button selector
// (`tweetButton` / `tweetButtonInline`). Playwright only opens/prefills; the
// human always clicks the final Post/Reply. Do not add a send selector here.

export const S = {
  // Present only when logged in — used to detect a successful manual login.
  composeButton: 'a[data-testid="SideNav_NewTweet_Button"]',
  loginLink: 'a[href="/login"], a[href="/i/flow/login"]',

  primaryColumn: '[data-testid="primaryColumn"]',
  tweet: 'article[data-testid="tweet"]',
  tweetText: '[data-testid="tweetText"]',
  socialContext: '[data-testid="socialContext"]', // marks "Pinned" / "reposted"
  statusLink: 'a[href*="/status/"]',
  time: 'time',

  // The reply ICON that OPENS the inline composer (NOT the send button).
  replyIcon: '[data-testid="reply"]',

  // Composer textarea (works for both new-post and inline reply).
  composerBox: '[data-testid="tweetTextarea_0"]',

  // Hidden <input type=file> for attaching media.
  fileInput: 'input[data-testid="fileInput"], input[type="file"]',

  // Follower count on a profile header.
  followLink: 'a[href$="/verified_followers"], a[href$="/followers"]',
};

/**
 * X renders an aggregated aria-label on each tweet's metric group with full,
 * un-abbreviated counts, e.g.:
 *   "12 replies, 8 reposts, 140 likes, 9 bookmarks, 23000 views"
 * Parse that instead of the visible "23K" abbreviations.
 * @param {string} label
 */
export function parseMetricsAria(label) {
  const text = label || '';
  const pick = (word) => {
    const m = text.match(new RegExp('([\\d,.]+)\\s+' + word, 'i'));
    return m ? Number(m[1].replace(/[,.]/g, '')) : 0;
  };
  return {
    replies: pick('repl(?:y|ies)'),
    reposts: pick('reposts?'),
    likes: pick('likes?'),
    bookmarks: pick('bookmarks?'),
    views: pick('views?'),
  };
}
