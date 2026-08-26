import sanitizeHtml from "sanitize-html";

export function sanitizeInboundHtml(html: string): string {
  // Conservative allowlist; blocks scripts, inline event handlers, and external loads.
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
    allowedAttributes: {
      a: ["href", "name", "target", "rel"],
      img: ["alt"],
      "*": ["class"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }),
      img: () => ({
        tagName: "span",
        attribs: {},
        text: "[bild borttagen]",
      }),
    },
  });
}

