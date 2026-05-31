/** Boil the verbose SDK errors down to a single useful sentence. */
export function friendlyAIError(msg: string | undefined | null): string {
  const text = String(msg || '').trim();
  if (!text) return 'AI request failed.';
  if (/429|too many requests|quota|rate.?limit/i.test(text)) {
    return 'AI provider quota or rate limit reached. Try the Flash model, switch provider, or retry in a few seconds.';
  }
  if (/401|invalid.api.key|api[_ ]?key|authentication/i.test(text)) {
    return 'AI provider rejected your API key. Open Settings to update it.';
  }
  if (/404.*not.*found|model.*not.*found|is not supported/i.test(text)) {
    return 'That model is not available for your account. Pick a different model.';
  }
  if (/permission.?denied|403/i.test(text)) {
    return 'AI provider denied access for this request (region or plan restriction).';
  }
  // First line of the raw error, capped so the toast doesn't swallow the screen.
  const firstLine = text.split('\n')[0];
  return firstLine.length > 240 ? firstLine.slice(0, 240) + '…' : firstLine;
}
