import DOMPurify from "dompurify"

// AI tool output (profile summaries, repo insights, compare verdicts) is
// rendered via dangerouslySetInnerHTML because lib/text-normalizer.ts's
// stripMarkdownSymbols() turns light markdown into a handful of HTML tags.
// The underlying text is model output built from third-party content
// (repo READMEs, commit messages, profile bios) that the model is free to
// echo back verbatim, so it must be treated as untrusted — a malicious
// README could otherwise prompt-inject the model into emitting a <script>
// or event-handler payload that executes for anyone who opens that tool.
// This sanitizes down to the small set of tags stripMarkdownSymbols
// actually produces (bold headings, bullet text, paragraphs/line breaks)
// and drops everything else, including all attributes.
const ALLOWED_TAGS = ["b", "strong", "i", "em", "p", "br", "ul", "ol", "li"]

export function sanitizeAIHtml(html: string): string {
  if (typeof window === "undefined") {
    // Never rendered during SSR (only ever produced inside client-side
    // streaming callbacks), but fail safe rather than throw if it ever is.
    return ""
  }
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR: [] })
}
