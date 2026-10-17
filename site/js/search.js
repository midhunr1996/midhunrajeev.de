// Keyword search over projects. Pure functions, no DOM.

/** Lower-case text keeping only letters (any script), digits, "+" and "#" (so "C++" and "C#" survive), single-spaced. */
export function normalise(text) {
  return String(text).toLowerCase().replace(/[^\p{L}\p{N}+#]+/gu, ' ').trim();
}

/**
 * True when every word of the query appears in the project's title, summary or tags.
 * Words are also matched against the text with spaces removed, so "ros2" finds "ROS 2 Humble".
 */
export function projectMatches(project, query) {
  const tokens = normalise(query).split(' ').filter(Boolean);
  if (tokens.length === 0) return true;
  const haystack = normalise([project.title, project.summary, ...(project.tags ?? [])].join(' '));
  const compact = haystack.replace(/ /g, '');
  return tokens.every((token) => haystack.includes(token) || compact.includes(token));
}
