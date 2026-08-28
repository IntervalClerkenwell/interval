/* ------------------------------------------------------------------
   Real addresses for the Visit page: /visit, /visit/restaurants,
   /visit/culture.

   The one page on the site with genuine search pull — somebody looking
   for galleries near Clerkenwell — lived only behind a hash, which a
   search engine reads as the homepage and a preview card reads as
   nothing in particular. This serves the same single page with each
   section's own title and description written into the head, exactly
   the arrangement events already have.

   Unlike an event there is nothing to fetch: the words are settled
   here, and the page draws the rest of itself as it always did. And
   unlike a viewing room these addresses are meant to be found, so
   nothing here says noindex.

   If the page cannot be fetched, the visitor is sent to the hash
   route, which is the one that has always worked.
   ------------------------------------------------------------------ */

const SITE = "https://interval-clerkenwell.art";
const IMAGE = SITE + "/assets/site/social-preview.jpg";

const SECTIONS = {
  galleries: {
    path: "/visit",
    title: "Galleries near Interval, Clerkenwell",
    desc: "Contemporary galleries within a walk of Interval at 73 Compton Street, Clerkenwell, " +
          "with addresses, opening hours and how long the walk is."
  },
  restaurants: {
    path: "/visit/restaurants",
    title: "Restaurants near Interval, Clerkenwell",
    desc: "Where to eat and drink around Interval in Clerkenwell: restaurants, bars and cafes " +
          "near 73 Compton Street, with addresses and walking times."
  },
  culture: {
    path: "/visit/culture",
    title: "Museums and culture near Interval, Clerkenwell",
    desc: "Museums and cultural institutions within reach of Interval at 73 Compton Street, " +
          "Clerkenwell, from the Museum of the Order of St John to the Barbican."
  }
};

const esc = (s) =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

function headFor(s){
  const url = SITE + s.path;
  return [
    `<base href="/">`,
    `<title>${esc(s.title)} · Interval</title>`,
    `<link rel="canonical" href="${esc(url)}">`,
    `<meta name="description" content="${esc(s.desc)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:title" content="${esc(s.title)}">`,
    `<meta property="og:description" content="${esc(s.desc)}">`,
    `<meta property="og:image" content="${IMAGE}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(s.title)}">`,
    `<meta name="twitter:description" content="${esc(s.desc)}">`,
    `<meta name="twitter:image" content="${IMAGE}">`
  ].join("\n");
}

/* The head already carries a set of these for the site as a whole.
   Both sets would be ambiguous, so the old ones come out first. Same
   rule, same shapes, as the events function. */
function stripSiteHead(html){
  return html
    .replace(/<title>[\s\S]*?<\/title>\s*/i, "")
    .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, "")
    .replace(/<meta\s+property="og:(?:type|url|title|description|image(?::width|:height)?)"[^>]*>\s*/gi, "")
    .replace(/<meta\s+name="(?:description|twitter:card|twitter:title|twitter:description|twitter:image)"[^>]*>\s*/gi, "");
}

export default async (request, context) => {
  const { pathname } = new URL(request.url);
  const m = /^\/visit(?:\/([a-z-]+))?\/?$/.exec(pathname);
  if(!m) return context.next();

  const key = m[1] || "galleries";
  /* An address that names no section goes to the front of Visit rather
     than to a bare 404: whoever typed it wanted the page. */
  if(!SECTIONS[key]) return Response.redirect(new URL("/visit", request.url), 302);
  const s = SECTIONS[key];

  let html;
  try{
    const page = await fetch(new URL("/index.html", request.url), {
      headers: { accept: "text/html" }
    });
    if(!page.ok) throw new Error("no page");
    html = await page.text();
  }catch(e){
    return Response.redirect(new URL("/#visit-" + key, request.url), 302);
  }

  const inject = headFor(s) +
    `\n<script>window.__route=${JSON.stringify("visit-" + key)}</script>\n</head>`;

  return new Response(stripSiteHead(html).replace("</head>", inject), {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      /* Same as the page it is built from. */
      "cache-control": "public, max-age=0, must-revalidate"
    }
  });
};
