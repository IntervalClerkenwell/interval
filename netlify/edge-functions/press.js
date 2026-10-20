/* ------------------------------------------------------------------
   A real address for the Press page: /press.

   Press lives in the page as a section reached by a hash, and a search
   engine reads /#press as the homepage, so a sitemap entry for it would
   say nothing. This serves the same single page with the section's own
   title and description written into the head, the arrangement Visit
   already has, and the old #press link goes on working.

   If the page cannot be fetched, the visitor is sent to the hash route,
   which is the one that has always worked.
   ------------------------------------------------------------------ */

const SITE = "https://interval-clerkenwell.art";
const IMAGE = SITE + "/assets/site/social-preview.jpg";
const PATH = "/press";
const TITLE = "Press";
const DESC = "What has been written about Interval, the gallery and project space at " +
             "73 Compton Street, Clerkenwell: reviews, interviews and features.";

const esc = (s) =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

function head(){
  const url = SITE + PATH;
  return [
    `<base href="/">`,
    `<title>${esc(TITLE)} · Interval</title>`,
    `<link rel="canonical" href="${esc(url)}">`,
    `<meta name="description" content="${esc(DESC)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:title" content="${esc(TITLE)} · Interval">`,
    `<meta property="og:description" content="${esc(DESC)}">`,
    `<meta property="og:image" content="${IMAGE}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(TITLE)} · Interval">`,
    `<meta name="twitter:description" content="${esc(DESC)}">`,
    `<meta name="twitter:image" content="${IMAGE}">`
  ].join("\n");
}

/* The site-wide set comes out first, same rule as Visit and events. */
function stripSiteHead(html){
  return html
    .replace(/<title>[\s\S]*?<\/title>\s*/i, "")
    .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, "")
    .replace(/<meta\s+property="og:(?:type|url|title|description|image(?::width|:height)?)"[^>]*>\s*/gi, "")
    .replace(/<meta\s+name="(?:description|twitter:card|twitter:title|twitter:description|twitter:image)"[^>]*>\s*/gi, "");
}

export default async (request, context) => {
  const { pathname } = new URL(request.url);
  if(!/^\/press\/?$/.test(pathname)) return context.next();

  let html;
  try{
    const page = await fetch(new URL("/index.html", request.url), {
      headers: { accept: "text/html" }
    });
    if(!page.ok) throw new Error("no page");
    html = await page.text();
  }catch(e){
    return Response.redirect(new URL("/#press", request.url), 302);
  }

  const inject = head() + `\n<script>window.__route="press"</script>\n</head>`;

  return new Response(stripSiteHead(html).replace("</head>", inject), {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=0, must-revalidate"
    }
  });
};
