export function formatQuery(query) {
  return (
    query
      .split("\n")
      .map(section => section.replace(/^\s*|\s*$/g, ""))
      .join(" ")
      .replace(/^\s*|\s*$/g, "")
  )
}
