import express from "express";
import cors from "cors";
import Parser from "rss-parser";
import fs from "fs";

const app = express();
const parser = new Parser();

app.use(cors());
app.use(express.json());

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
      grouped[cat] = items.slice(0, 2); // सिर्फ़ हिंदी headlines, 2-2 headlines दिखेंगी
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

    const ql = q.toLowerCase();
    const isHindi = /[\u0900-\u097F]/.test(q);

    // Allowed keyword sets
    const cities = ["जयपुर","दिल्ली","मुंबई","दौसा","कोटा","लखनऊ"];
    const statesCountries = ["राजस्थान","उत्तर प्रदेश","भारत","अमेरिका","ईरान","चीन"];
    const Persons and posts = ["मोदी","प्रधानमंत्री","पीएम","नरेन्द्र मोदी","सीएम"];
    const topics = ["क्रिकेट","ipl","शेयर बाजार","फिल्म","त्योहार"];

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

    function normalize(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[.,;:!?()'"“”‘’]/g, "")
    .trim();
}

const qNorm = normalize(q);

// Step 1: headlines में खोजें
let matched = allNews.filter((it) => {
  const title = normalize(it.title);
  return title.includes(qNorm);
});

// Step 2: अगर headlines में नहीं मिला तो summaries में खोजें
if (matched.length === 0) {
  matched = allNews.filter((it) => {
    const summary = normalize(it.summary);
    const description = normalize(it.description);
    const content = normalize(it.content);
return (
          summary.includes(qNorm) ||
          description.includes(qNorm) ||
          content.includes(qNorm)
        );
      });
    }

    return res.json({ query: q, count: matched.length, news: matched.slice(0, 20) });
  } catch (err) {
    console.error("Error /ask:", err);
    return res.status(500).json({ error: "Error searching news" });
  }
});

// /custom (User Uploaded News)
app.get("/custom", async (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync("./public/custom-news.json", "utf-8"));
    res.json({ news: data });
  } catch (err) {
    console.error("Error /custom:", err);
    res.status(500).json({ error: "Failed to load custom news" });
  }
});

// /trending
app.get("/trending", async (req, res) => {
  try {
    const data = [
      { title: "India wins crucial cricket match", link: "https://www.espncricinfo.com/" },
      { title: "New AI policy announced by govt", link: "https://www.livemint.com/" },
      { title: "Bollywood movie breaks box office records", link: "https://www.bollywoodhungama.com/" },
      { title: "Global markets show recovery signs", link: "https://economictimes.indiatimes.com/" },
      { title: "Major tech launch excites youth", link: "https://www.gadgets360.com/" }
    ];
    res.json({ news: data });
  } catch (err) {
    res.status(500).json({ error: "Failed to load trending" });
  }
});

// /health
app.get("/health", (req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => console.log(`✔ Backend running on port ${PORT}`));
