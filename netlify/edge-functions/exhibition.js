/* ------------------------------------------------------------------
   Real addresses for exhibitions: /exhibitions/<slug>.

   An exhibition used to live only at #<slug>, drawn after the page had
   loaded. That is fine in a browser and useless everywhere a link
   actually travels — WhatsApp, a mail client, Google — which read the
   HTML as it arrives and never run the script, so every show previewed
   as the gallery in general and never as itself.

   This serves the same single page with each show's own title,
   description and photograph written into the head, exactly the
   arrangement events and the Visit page already have. The copy for a
   show is settled here in this file, not fetched from anywhere, so
   unlike an event there is nothing to wait for.

   Two rules it keeps to, the same two the events function keeps:

   - the old #<slug> addresses go on working. Links have been shared
     with them and a link that is out in the world is not ours to break.
   - it never fails the page. If the page cannot be fetched or the slug
     is unknown, the visitor is sent to the hash route that has always
     worked, or to the front of the site.
   ------------------------------------------------------------------ */

const SITE = "https://interval-clerkenwell.art";

/* One entry per exhibition section in index.html. The slug is the
   section's own data-page, so the router in the page lands on the right
   show from window.__route without any new wiring. Titles, dates and
   the lead line are taken verbatim from the section; the image is that
   section's first photograph. The one exception is the-shudder, which
   has no article of its own and lives in the Upcoming list, so it
   routes there. */
const SHOWS = {
  "interval-one": {
    title: "Interval One: Scarlet Topley and Ed Ruscha",
    desc: "18th July – 5th September 2026 · Lorette by Scarlet Topley, the first exhibition of Interval One — an annual programme featuring one graduating artist each year — presented alongside Ed Ruscha.",
    image: "/assets/exhibitions/interval-one/scarlet-topley.jpg"
  },
  "newport": {
    title: "Frederic Anderson: Newport 1958",
    desc: "30th May – 4th July 2026 · New gestural abstract paintings by Frederic Anderson alongside print works by Antoni Tàpies, with the concert film Jazz on a Summer's Day.",
    image: "/assets/exhibitions/newport/river-mint-high-expectations.jpg"
  },
  "scenes": {
    title: "Simon Moretti: Scenes from a Divided Subject",
    desc: "11th April – 16th May 2026 · An exhibition by Simon Moretti engaging with the writings of Jacques Lacan, featuring Paul Éluard, Pablo Picasso and Joel Wyllie.",
    image: "/assets/exhibitions/scenes/the-fertile-i-neon.jpg"
  },
  "gracepoint": {
    title: 'Petra Cortright: "gracePOINT" – Independent Art Fair 2026',
    desc: '14th – 17th May 2026 · "gracePOINT" by LA-based artist Petra Cortright: new digital paintings on aluminium alongside a video, presented at Independent Art Fair, New York.',
    image: "/assets/exhibitions/gracepoint/photonic-array.jpg"
  },
  "lustre": {
    title: "Lustre: Sebastián Espejo & Pierre Bonnard",
    desc: "24th January – 28th March 2026 · An exhibition by London-based painter Sebastián Espejo, presented alongside works by Pierre Bonnard and Japanese woodblock prints by Hokusai and Hiroshige.",
    image: "/assets/exhibitions/lustre/espejo-rocas-en-el-mar.jpg"
  },
  "noblecurve": {
    title: '"NOBLEcurve" featuring Petra Cortright',
    desc: "27 September – 20 December 2025 · Interval's inaugural exhibition: new digital paintings by Petra Cortright, presented alongside Old Master works in collaboration with Sam Fogg and Rafael Valls Gallery.",
    image: "/assets/exhibitions/noblecurve/noblecurve-installation-view.jpg"
  },
  "the-shudder": {
    title: "The Shudder",
    desc: "24th September – 19th December 2026 · Featuring Lewis Brander, Jane Bustin, Edwina Leapman, Gal Schindler and Richard Serra.",
    image: "/assets/exhibitions/the-shudder/the-shudder.jpg",
    /* No article of its own: it is shown in the Upcoming list. */
    route: "upcoming"
  }
};

const esc = (s) =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

function headFor(slug, s){
  const url = SITE + "/exhibitions/" + slug;
  const img = SITE + s.image;
  return [
    /* Every URL in the page is written relative to the root, and this
       is not served from it. */
    `<base href="/">`,
    `<title>${esc(s.title)} · Interval</title>`,
    `<link rel="canonical" href="${esc(url)}">`,
    `<meta name="description" content="${esc(s.desc)}">`,
    `<meta property="og:type" content="article">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:title" content="${esc(s.title)}">`,
    `<meta property="og:description" content="${esc(s.desc)}">`,
    `<meta property="og:image" content="${esc(img)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(s.title)}">`,
    `<meta name="twitter:description" content="${esc(s.desc)}">`,
    `<meta name="twitter:image" content="${esc(img)}">`
  ].join("\n");
}

/* The head already carries a set of these for the site as a whole.
   Both sets would be ambiguous, so the old ones come out first. Same
   rule, same shapes, as the events and visit functions. */
function stripSiteHead(html){
  return html
    .replace(/<title>[\s\S]*?<\/title>\s*/i, "")
    .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, "")
    .replace(/<meta\s+property="og:(?:type|url|title|description|image(?::width|:height)?)"[^>]*>\s*/gi, "")
    .replace(/<meta\s+name="(?:description|twitter:card|twitter:title|twitter:description|twitter:image)"[^>]*>\s*/gi, "");
}

export default async (request, context) => {
  const { pathname } = new URL(request.url);
  const m = /^\/exhibitions\/([a-z0-9][a-z0-9-]{1,47})\/?$/.exec(pathname);

  /* A bare /exhibitions, or anything that is not a slug at all, goes to
     the past-shows list rather than a bare 404: whoever typed it wanted
     the exhibitions. */
  if(!m) return Response.redirect(new URL("/#past", request.url), 302);

  const slug = m[1];
  /* A slug in the right shape but not a show we have goes to the front
     of the site, like the other functions send an unknown address home. */
  if(!SHOWS[slug]) return Response.redirect(new URL("/", request.url), 302);
  const s = SHOWS[slug];
  const route = s.route || slug;

  let html;
  try{
    const page = await fetch(new URL("/index.html", request.url), {
      headers: { accept: "text/html" }
    });
    if(!page.ok) throw new Error("no page");
    html = await page.text();
  }catch(e){
    /* The hash route is the one that has always worked. */
    return Response.redirect(new URL("/#" + route, request.url), 302);
  }

  const inject = headFor(slug, s) +
    `\n<script>window.__route=${JSON.stringify(route)}</script>\n</head>`;

  return new Response(stripSiteHead(html).replace("</head>", inject), {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      /* Same as the page it is built from: a show goes up by editing the
         page, and the change has to show at once. */
      "cache-control": "public, max-age=0, must-revalidate"
    }
  });
};
