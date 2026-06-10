export default function stripHtml(value) {
  if (!value) return "";

  if (typeof window !== "undefined" && typeof window.DOMParser !== "undefined") {
    const parser = new window.DOMParser();
    const document = parser.parseFromString(String(value), "text/html");
    return (document.body.textContent || "").replace(/\s+/g, " ").trim();
  }

  return String(value).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}