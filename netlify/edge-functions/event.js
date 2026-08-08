/* ------------------------------------------------------------------
   Real addresses for events: /events and /events/<slug>.

   An event used to live at #event-<slug>, drawn by JavaScript after
   the page had loaded. That works in a browser and fails everywhere an
   invitation actually travels: WhatsApp, Instagram, a mail client and
   Google all read the HTML as it arrives and never run the script, so
   every event previewed as "Interval, a gallery and project space in
   Clerkenwell" whatever the show was.

   This serves the same single page, with the event's own title,
   description and photograph written into the head before it leaves.
   The page still draws itself from the feed as it always did; this
   only settles what the head says.

   Two rules it keeps to:

   - the old #event-<slug> addresses go on working. Invitations have
     already been sent with them, and a link that has been posted
     somewhere is not ours to break.
   - it never fails the page. If the Desk is unreachable or the slug is
     unknown, the page is served exactly as it is and says so itself in
     the words it already has.
   ------------------------------------------------------------------ */

const DESK = "https://interval-desk.netlify.app";
const SITE = "https://interval-clerkenwell.art";

const esc = (s) =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/* A description is read in a preview card two lines high, so it is cut
   to something that ends on a word rather than mid sentence. The date
   and place lead, because that is what somebody deciding whether to
   come actually needs; the blurb follows if there is room. */
function describe(ev) {
  const head = [ev.when, ev.where].filter(Boolean).join(" · ");
  const blurb = String(ev.blurb || "").replace(/\s+/g, " ").trim();
  let out = [head, blurb].filter(Boolean).join(" — ");
  if (out.length <= 200) return out;
  out = out.slice(0, 200);
  return out.slice(0, out.lastIndexOf(" ")).replace(/[,;:—-]$/, "") + "…";
}

function headFor(ev) {
  const url = SITE + "/events/" + ev.slug;
  const title = [ev.title, "Interval"].join(" · ");
  const desc = describe(ev);
  const img = ev.image ? DESK + ev.image : SITE + "/assets/site/social-preview.jpg";

  return [
    /* Every URL in the page is written relative to the root, and this
       is the only page not served from it. */
    `<base href="/">`,
    `<title>${esc(title)}</title>`,
    `<link rel="canonical" href="${esc(url)}">`,
    `<meta name="description" content="${esc(desc)}">`,
    `<meta property="og:type" content="article">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:title" content="${esc(ev.title)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:image" content="${esc(img)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(ev.title)}">`,
    `<meta name="twitter:description" content="${esc(desc)}">`,
    `<meta name="twitter:image" content="${esc(img)}">`
  ].join("\n");
}

/* The head already carries a set of these for the site as a whole.
   Both sets would be ambiguous, so the old ones come out first. */
function stripSiteHead(html) {
  return html
    .replace(/<title>[\s\S]*?<\/title>\s*/i, "")
    .replace(/<meta\s+property="og:(?:type|url|title|description|image(?::width|:height)?)"[^>]*>\s*/gi, "")
    .replace(/<meta\s+name="(?:description|twitter:card|twitter:title|twitter:description|twitter:image)"[^>]*>\s*/gi, "");
}

export default async (request, context) => {
  const { pathname } = new URL(request.url);
  const m = /^\/events\/([a-z0-9][a-z0-9-]{1,47})\/?$/.exec(pathname);
  const isList = /^\/events\/?$/.test(pathname);
  if (!m && !isList) return context.next();

  /* If the page itself cannot be fetched, falling through to the origin
     is no use: there is no file at /events/<slug>, so context.next() is
     a bare 404 rather than a page. The hash route is the one that worked
     before any of this existed and still works, so a visitor is sent
     there instead and sees the event.

     Seen once for real, in the seconds after a deploy swapped the
     function in. Brief and self healing, but a link handed to a
     collector should not have a window where it 404s. */
  const fallback = () =>
    m ? Response.redirect(new URL("/#event-" + m[1], request.url), 302)
      : Response.redirect(new URL("/#events", request.url), 302);

  let html;
  try {
    const page = await fetch(new URL("/index.html", request.url), {
      headers: { accept: "text/html" }
    });
    if (!page.ok) return fallback();
    html = await page.text();
  } catch (e) {
    return fallback();
  }

  /* Which section to open. The router in the page reads this rather
     than the address bar, so one page keeps serving both the old
     #event-<slug> links and these. */
  let route = "events";
  let ev = null;

  if (m) {
    route = "event-" + m[1];
    try {
      const res = await fetch(DESK + "/api/events/public", {
        headers: { accept: "application/json" }
      });
      if (res.ok) {
        const data = await res.json();
        ev = ((data && data.events) || []).find((x) => x.slug === m[1]) || null;
      }
    } catch (e) {
      /* The page says so itself, in its own words. */
    }
  }

  /* Order matters: the site's own tags come out before the event's go
     in, or the strip would take the new ones straight back out. */
  const inject =
    (ev ? headFor(ev) : `<base href="/">`) +
    `\n<script>window.__route=${JSON.stringify(route)}</script>\n</head>`;

  const out = (ev ? stripSiteHead(html) : html).replace("</head>", inject);

  return new Response(out, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      /* Same as the page it is built from: an event is edited in the
         Desk and the change has to show at once. */
      "cache-control": "public, max-age=0, must-revalidate"
    }
  });
};
