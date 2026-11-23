/* =========================================================================
   config.js  -  the ONLY file you need to edit to update the site.
   Layout code lives in index.html / styles.css / app.js.
   ========================================================================= */

window.SITE_CONFIG = {

  /* ---------- 1. IDENTITY ---------- */
  name: "Aathi",                       // Shown in navbar + hero + footer
  monogram: "A",                       // Single letter(s) in the navbar badge
  subtitle: "DP / CINEMATOGRAPHER",    // Navbar subtitle
  heroHeadline: "Light is the<br>first <em>character.</em>",
  heroTagline: "Director of Photography  ·  Commercials  ·  Narrative  ·  Music Videos",
  heroMeta: "Anamorphic 2.39:1  ·  ARRI  ·  RED  ·  Sony Venice",
  location: "Based in India  ·  Available worldwide",

  /* ---------- 2. CONTACT & SOCIAL ---------- */
  email: "hello@example.com",
  whatsapp: "910000000000",            // Digits only, with country code, no "+"
  instagram: "https://instagram.com/yourhandle",
  imdb: "https://www.imdb.com/name/nm0000000/",
  vimeo: "https://vimeo.com/yourhandle",

  /* ---------- 3. CLOUDINARY (stills, hero, portrait, BTS) ----------
     Find your Cloud name on the Cloudinary dashboard (top-left).
     Leave as "" to preview the site with built-in placeholder frames.

     Tag your images in Cloudinary with these tags (rename if you like):
       hero              -> hero background (first image found is used)
       about             -> portrait in About section
       stills-all        -> shows under "All Stills" (and nowhere else)
       narrative-frames  -> "Narrative" filter   (also shows in All)
       commercial-frames -> "Commercial" filter  (also shows in All)
       color-grading     -> "Color Grading" filter (also shows in All)
       bts               -> "BTS" filter         (also shows in All)
  */
  CLOUDINARY_CLOUD_NAME: "",

  CLOUDINARY_TAGS: {
    hero: "hero",
    about: "about",
    all: "stills-all"
  },

  // Gallery filters. `tag` is the Cloudinary tag. `label` is the tab text.
  STILL_CATEGORIES: [
    { key: "narrative",  label: "Narrative",     tag: "narrative-frames" },
    { key: "commercial", label: "Commercial",    tag: "commercial-frames" },
    { key: "grading",    label: "Color Grading", tag: "color-grading" },
    { key: "bts",        label: "BTS",           tag: "bts" }
  ],

  // Cloudinary transformations
  IMG_GRID: "f_auto,q_auto,w_900",
  IMG_FULL: "f_auto,q_auto,w_2048",
  IMG_HERO: "f_auto,q_auto,w_2400",
  IMG_PORTRAIT: "f_auto,q_auto,w_900,c_fill,g_auto,ar_4:5",

  /* ---------- 3b. LOG vs FINAL GRADE slider ----------
     Uses images tagged `tag` in Cloudinary and renders each one twice with
     different transformations. "/" chains separate effect steps.
     Tip: upload your FINAL graded frame. logLook then flattens it into a
     LOG-style image. If you upload flat LOG frames instead, make finalLook
     stronger and logLook empty ("").
     Set enabled:false to hide the block. */
  GRADE_COMPARE: {
    enabled: true,
    tag: "color-grading",
    max: 4,                                    // frames offered (Frame 1..n)
    base: "f_auto,q_auto,w_1600",
    logLook: "e_saturation:-70/e_contrast:-45/e_brightness:12",
    finalLook: "e_contrast:10/e_saturation:15"
  },

  /* ---------- 4. SHOWREEL (the big banner at the top of Work) ---------- */
  SHOWREEL: {
    youtubeId: "dQw4w9WgXcQ",          // <-- replace with your showreel's YouTube ID
    title: "Director's Showreel",
    role: "Director of Photography",
    camera: "ARRI Alexa Mini LF  ·  Cooke Anamorphic/i",
    year: "2025",
    runtime: "1:30"
  },

  /* ---------- 5. FILMS ----------
     The YouTube ID is the part after  watch?v=  (Public or Unlisted both work).
     Example: https://www.youtube.com/watch?v=AbC123xyz_0  ->  "AbC123xyz_0"

     Fields:
       id        YouTube video ID
       title     Film title
       category  one of: "Commercials", "Narrative", "Music Videos", "Documentary"
       role      e.g. "DP / Colorist"
       camera    e.g. "ARRI Alexa Mini LF / Cooke Anamorphic"
       year      e.g. "2025"
       ratio     optional: "2.39" for a scope-wide card (default is 16:9)
       thumb     optional: Cloudinary public ID or full image URL to override thumbnail
  */
  FILMS: [
    { id: "dQw4w9WgXcQ", title: "Ember",          category: "Narrative",    role: "DP / Colorist",         camera: "ARRI Alexa Mini LF / Cooke Anamorphic", year: "2025", ratio: "2.39" },
    { id: "dQw4w9WgXcQ", title: "Northbound",     category: "Commercials",  role: "Director of Photography", camera: "RED V-Raptor / Zeiss Supreme Prime",   year: "2025" },
    { id: "dQw4w9WgXcQ", title: "Neon Hours",     category: "Music Videos", role: "DP / Colorist",         camera: "Sony Venice 2 / Atlas Orion",           year: "2024", ratio: "2.39" },
    { id: "dQw4w9WgXcQ", title: "Salt & Ash",     category: "Documentary",  role: "Cinematographer",       camera: "Sony FX6 / Sigma Cine",                 year: "2024" },
    { id: "dQw4w9WgXcQ", title: "Velvet Room",    category: "Narrative",    role: "Director of Photography", camera: "ARRI Alexa 35 / Panavision C-Series",  year: "2024" },
    { id: "dQw4w9WgXcQ", title: "Monsoon Light",  category: "Commercials",  role: "DP / Colorist",         camera: "ARRI Alexa Mini / Cooke S4",            year: "2023" }
  ],

  /* ---------- 6. ABOUT ---------- */
  ABOUT: {
    heading: "Cinematography with a painter's patience.",
    bio: [
      "I'm a director of photography working across narrative, commercial and music film. My approach starts with light and motivation: shaping a frame so the audience feels the scene before they read it.",
      "I work closely with directors and production designers from early look development through to the final grade, so the image on set is the image on screen."
    ],
    credits: [
      "Official Selection, Your Festival Name 2025",
      "Best Cinematography, Your Festival Name 2024",
      "Client: Brand One",
      "Client: Brand Two",
      "Client: Label / Artist Name"
    ],
    cards: [
      {
        title: "Cinematography Services",
        items: ["Director of Photography", "Look development & test shoots", "Lighting design & camera operation", "Second-unit / drone cinematography"]
      },
      {
        title: "Camera & Lens Package",
        items: ["ARRI Alexa Mini LF", "Cooke Anamorphic/i & Zeiss Supreme", "DJI Ronin 4D, Easyrig, Dana Dolly", "Aputure & Astera lighting kit"]
      },
      {
        title: "Color Grading / Post",
        items: ["DaVinci Resolve Studio", "ACES / Filmic LUT pipelines", "On-set DIT & dailies", "HDR & SDR deliverables"]
      }
    ]
  },

  /* ---------- 7. INQUIRY FORM ----------
     provider: "web3forms" -> paste your Access Key from https://web3forms.com
     provider: "formspree" -> paste endpoint, e.g. https://formspree.io/f/abcdwxyz
  */
  FORM: {
    provider: "web3forms",
    web3formsAccessKey: "",
    formspreeEndpoint: ""
  }
};
