import express from "express";
import cors from "cors";
import Parser from "rss-parser";
import fs from "fs";

const app = express();
const parser = new Parser();

app.use(cors());
app.use(express.json());

const ADMIN_PIN = "1336";

// RSS feeds (Hindi + English, category-wise)
const FEEDS = {
  International: [
    "https://api.livehindustan.com/feeds/rss/international/rssfeed.xml",
    "https://www.bbc.com/hindi/index.xml",
    "https://feeds.bbci.co.uk/news/world/rss.xml"
  ],
  India: [
    "https://www.amarujala.com/rss/breaking-news.xml",
    "https://api.livehindustan.com/feeds/rss/latest/rssfeed.xml",
    "https://www.bbc.com/hindi/index.xml",
    "https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms"
  ],
  Rajasthan: [
    "https://www.amarujala.com/rss/rajasthan.xml",
    "https://api.livehindustan.com/feeds/rss/rajasthan/rssfeed.xml"
  ],
  Sports: [
    "https://www.amarujala.com/rss/sports.xml",
    "https://api.livehindustan.com/feeds/rss/sports/rssfeed.xml",
    "https://timesofindia.indiatimes.com/rssfeeds/4719148.cms"
  ],
  Business: [
    "https://www.amarujala.com/rss/business.xml",
    "https://api.livehindustan.com/feeds/rss/business/rssfeed.xml",
    "https://www.livemint.com/rss/markets"
  ],
  Entertainment: [
    "https://www.amarujala.com/rss/entertainment.xml",
    "https://api.livehindustan.com/feeds/rss/entertainment/rssfeed.xml",
    "https://www.bollywoodhungama.com/rss/news.xml"
  ]
};
// fallback sample
const FALLBACK = [
  { id: "n1", title: "India launches new AI policy", link: "" },
  { id: "n2", title: "Monsoon updates", link: "" },
  { id: "n3", title: "Tech startup raises funds", link: "" }
];

// Helper: fetch & parse feeds
async function fetchFeeds(urls) {
  let all = [];
  for (const url of urls) {
    try {
      const feed = await parser.parseURL(url);
      if (Array.isArray(feed.items)) {
        feed.items.forEach((it, idx) => {
          all.push({
            id: it.guid || it.id || `${url}-${idx}`,
            title: it.title || "No title",
            summary: it.contentSnippet || it.summary || it.content || "",
            link: it.link || "",
            pubDate: it.pubDate || it.isoDate || null,
            source: new URL(url).hostname.replace("www.", "")
          });
        });
      }
    } catch (err) {
      console.error("Feed error:", url, err && err.message);
    }
  }
  return all;
}

// Root
app.get("/", (req, res) => {
  res.json({ message: "QuickNewsGPT backend running ✔", endpoints: ["/news", "/ask", "/custom", "/trending", "/health"] });
});

// /news → category-wise news (alternate Hindi + English, safe fallback)
app.get("/news", async (req, res) => {
  try {
    const grouped = {};
    for (const cat of Object.keys(FEEDS)) {
      const items = await fetchFeeds(FEEDS[cat]);
      // सिर्फ़ हिंदी headlines, दो‑दो
      grouped[cat] = items.slice(0, 2);
    }

    return res.json({ date: new Date().toISOString(), news: grouped });
  } catch (err) {
    console.error("Error /news:", err);
    return res.status(500).json({ error: "Error fetching news" });
  }
});

// /ask → Hindi/English queries
app.get("/ask", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.status(400).json({ error: "Please provide a query." });

    const isHindi = /[\u0900-\u097F]/.test(q);

    // Allowed keyword sets
const cities = [
  "जयपुर","दिल्ली","मुंबई","दौसा","कोटा","लखनऊ",
  "उदयपुर","भोपाल","पुणे","चेन्नई","हैदराबाद","बेंगलुरु"
];

const statesCountries = [
  "राजस्थान","उत्तर प्रदेश","मध्य प्रदेश","महाराष्ट्र","गुजरात",
  "भारत","अमेरिका","ईरान","चीन","पाकिस्तान","बांग्लादेश","नेपाल","इसराइल"
];

const topics = [
  "क्रिकेट","ipl","शेयर बाजार","फिल्म","त्योहार","राजनीति","चुनाव","आर्थिक संकट"
];

const leaders = [
  "मोदी","नरेंद्र मोदी","प्रधानमंत्री","ट्रंप","डोनाल्ड ट्रंप","राष्ट्रपति",
  "जो बाइडेन","मुख्यमंत्री","गृह मंत्री","विदेश मंत्री"
];

    let feedsToSearch = isHindi
      ? [
          "https://www.amarujala.com/rss/breaking-news.xml",
          "https://api.livehindustan.com/feeds/rss/latest/rssfeed.xml",
          "https://www.bbc.com/hindi/index.xml"
        ]
      : [
          "https://www.indiatoday.in/rss/home",
          "https://timesofindia.indiatimes.com/rssfeeds/4719148.cms",
          "https://feeds.bbci.co.uk/news/world/rss.xml"
        ];

    let allNews = await fetchFeeds(feedsToSearch);

    // Normalize function
    function normalize(text) {
      return (text || "")
        .toLowerCase()
        .replace(/[.,;:!?()'"“”‘’]/g, "")
        .trim();
    }

    const qNorm = normalize(q);

    // Expand query with keyword sets
    let qVariants = [qNorm];
    [...cities, ...statesCountries, ...topics].forEach((kw) => {
      if (qNorm.includes(normalize(kw))) {
        qVariants.push(normalize(kw));
      }
    });

    // Step 1: headlines में खोजें
    let matched = allNews.filter((it) => {
      const title = normalize(it.title);
      return qVariants.some((kw) => title.includes(kw));
    });

    // Step 2: अगर headlines में नहीं मिला तो summaries/description/contentSnippet में खोजें
    if (matched.length === 0) {
      matched = allNews.filter((it) => {
        const summary = normalize(it.summary);
        const description = normalize(it.description);
        const content = normalize(it.contentSnippet || it.content);
        return qVariants.some(
          (kw) =>
            summary.includes(kw) ||
            description.includes(kw) ||
            content.includes(kw)
        );
      });
    }

    return res.json({
      query: q,
      count: matched.length,
      news: matched.slice(0, 20)
    });
  } catch (err) {
    console.error("Error /ask:", err);
    return res.status(500).json({ error: "Error searching news" });
  }
});

app.get("/goldsilver", async (req, res) => {
  try {
    let results = {
      source: [],
      date: new Date().toLocaleString("en-IN"),
      gold: {},
      silver: {}
    };

    // ----------- Source 1: 5paisa (Gold) -----------
    try {
      const url1 = "https://www.5paisa.com/hindi/commodity-trading/gold/jaipur";
      let response = await fetch(url1);
      let html = await response.text();

      // 24K Gold
      const gold24_1gm = html.match(/1\s*ग्राम[^₹]*₹\s*([\d,]+)/i);
      const gold24_10gm = html.match(/10\s*ग्राम[^₹]*₹\s*([\d,]+)/i);
      const gold24_100gm = html.match(/100\s*ग्राम[^₹]*₹\s*([\d,]+)/i);
      const gold24_1kg = html.match(/1\s*किलो[^₹]*₹\s*([\d,]+)/i);

      if (gold24_1gm) results.gold["24K_1gm_5paisa"] = `₹${gold24_1gm[1]}`;
      if (gold24_10gm) results.gold["24K_10gm_5paisa"] = `₹${gold24_10gm[1]}`;
      if (gold24_100gm) results.gold["24K_100gm_5paisa"] = `₹${gold24_100gm[1]}`;
      if (gold24_1kg) results.gold["24K_1kg_5paisa"] = `₹${gold24_1kg[1]}`;

      // 22K Gold
      const gold22_1gm = html.match(/1\s*ग्राम[^₹]*₹\s*([\d,]+)/i);
      const gold22_10gm = html.match(/10\s*ग्राम[^₹]*₹\s*([\d,]+)/i);
      const gold22_100gm = html.match(/100\s*ग्राम[^₹]*₹\s*([\d,]+)/i);
      const gold22_1kg = html.match(/1\s*किलो[^₹]*₹\s*([\d,]+)/i);

      if (gold22_1gm) results.gold["22K_1gm_5paisa"] = `₹${gold22_1gm[1]}`;
      if (gold22_10gm) results.gold["22K_10gm_5paisa"] = `₹${gold22_10gm[1]}`;
      if (gold22_100gm) results.gold["22K_100gm_5paisa"] = `₹${gold22_100gm[1]}`;
      if (gold22_1kg) results.gold["22K_1kg_5paisa"] = `₹${gold22_1kg[1]}`;

      results.source.push("5paisa");
    } catch (e) {
      console.error("5paisa error:", e);
    }

    // ----------- Source 2: Gadgets360 (Silver) -----------
    try {
      const url2 = "https://hindi.gadgets360.com/finance/silver-rate-in-jaipur";
      let response = await fetch(url2);
      let html = await response.text();

      const silver1gm = html.match(/1\s*ग्राम[^₹]*₹\s*([\d,]+)/i);
      const silver10gm = html.match(/10\s*ग्राम[^₹]*₹\s*([\d,]+)/i);
      const silver100gm = html.match(/100\s*ग्राम[^₹]*₹\s*([\d,]+)/i);
      const silver1kg = html.match(/1\s*Kg[^₹]*₹\s*([\d,]+)/i);

      if (silver1gm) results.silver["1gm_Gadgets360"] = `₹${silver1gm[1]}`;
      if (silver10gm) results.silver["10gm_Gadgets360"] = `₹${silver10gm[1]}`;
      if (silver100gm) results.silver["100gm_Gadgets360"] = `₹${silver100gm[1]}`;
      if (silver1kg) results.silver["1kg_Gadgets360"] = `₹${silver1kg[1]}`;

      results.source.push("Gadgets360");
    } catch (e) {
      console.error("Gadgets360 error:", e);
    }

    // ----------- Fallback: GoldPriceIndia (Silver) -----------
    if (!results.silver["1kg_Gadgets360"]) {
      try {
        const url3 = "https://www.goldpriceindia.com/gold-price-jaipur.php";
        let response = await fetch(url3);
        let html = await response.text();

        const silverMatch2 = html.match(/1\s*kilogram[^₹]*₹([\d,]+)/i);
        if (silverMatch2) results.silver["1kg_GoldPriceIndia"] = `₹${silverMatch2[1]}`;

        results.source.push("GoldPriceIndia");
      } catch (e) {
        console.error("GoldPriceIndia error:", e);
      }
    }

    res.json(results);
  } catch (err) {
    console.error("Collector error:", err);
    res.status(500).json({ error: "Failed to collect gold/silver rates" });
  }
});

// /health
app.get("/health", (req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => console.log(`✔ Backend running on port ${PORT}`));
