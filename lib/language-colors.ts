// GitHub linguist-style colors for common languages, so language indicators
// across the app (repo lists, language charts) match what GitHub itself shows
// instead of a single arbitrary dot color.
export const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Python: "#3572A5",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#555555",
  "C#": "#178600",
  Ruby: "#701516",
  Go: "#00ADD8",
  PHP: "#4F5D95",
  Swift: "#ffac45",
  Kotlin: "#A97BFF",
  Rust: "#dea584",
  Dart: "#00B4AB",
  Scala: "#c22d40",
  "Objective-C": "#438eff",
  Shell: "#89e051",
  Vue: "#41b883",
  Elixir: "#6e4a7e",
  Haskell: "#5e5086",
  Lua: "#000080",
  Clojure: "#db5855",
  Zig: "#ec915c",
  R: "#198CE7",
  Julia: "#a270ba",
  MDX: "#fcb32c",
  Astro: "#ff5a03",
}

// Deterministic fallback color for languages not in the map above, so the
// same language always renders the same hue.
export function getLanguageColor(language: string | null | undefined): string {
  if (!language) return "#8b92a5"
  if (LANGUAGE_COLORS[language]) return LANGUAGE_COLORS[language]
  const hash = Math.abs(
    language.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
  )
  return `hsl(${hash % 360}, 62%, 55%)`
}
