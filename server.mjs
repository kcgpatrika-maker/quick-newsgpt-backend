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
  General: [
    "https://rss.aajtak.in/rssfeed/120-India.xml",
    "https://feeds.bbci.co.uk/hindi/rss.xml",
    "https://timesofindia.indiatimes.com/rssfeedstopstories.cms",
    "https://www.indiatoday.in/rss/home"
  ],
  Sports: [
    "https://timesofindia.indiatimes.com/rssfeeds/4719148.cms", // TOI Sports
    "https://www.espncricinfo.com/rss/content/story/feeds/0.xml" // Cricinfo
  ],
  Business: [
    "https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms",
    "https://www.moneycontrol.com/rss/latestnews.xml"
  ],
  Entertainment: [
    "https://timesofindia.indiatimes.com/rssfeeds/1081479906.cms", // TOI Entertainment
    "https://www.bollywoodhungama.com/rss/news.xml"
  ]
};

// fallback sample
const FALLBACK = [
  { id: "n1", title: "India launches new AI policy", summary: "Govt releases guidelines to boost AI transparency and local innovation.", link: "" },
  { id: "n2", title: "Monsoon updates", summary: "Heavy rains expected in coastal belts; farmers advised to prepare.", link: "" },
  { id: "n3", title: "Tech startup raises funds", summary: "A Bengaluru startup raised $5M for climate-tech product.", link: "" }
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
  res.json({ message: "QuickNewsGPT backend running ✔", endpoints: ["/news", "/ask", "/custom", "/health"] });
});

// /news → category-wise news
app.get("/news", async (req, res) => {
  try {
    const grouped = {};
    for (const cat of Object.keys(FEEDS)) {
      const items = await fetchFeeds(FEEDS[cat]);
      grouped[cat] = items.slice(0, 2); // हर category से 2 खबरें
    }
    return res.json({ date: new Date().toISOString(), news: grouped });
  } catch (err) {
    console.error("Error /news:", err);
    return res.status(500).json({ error: "Error fetching news", fallback: FALLBACK });
  }
});

// /ask → हिंदी + अंग्रेज़ी queries
app.get("/ask", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.status(400).json({ error: "Please provide a query." });

    // सभी feeds से news लाओ
    let allNews = [];
    for (const cat of Object.keys(FEEDS)) {
      const items = await fetchFeeds(FEEDS[cat]);
      allNews = allNews.concat(items);
    }
    const source = (allNews && allNews.length > 0) ? allNews : FALLBACK;

    const ql = q.toLowerCase();
    const matched = source.filter(
      (it) =>
        (it.title && (it.title.toLowerCase().includes(ql) || it.title.includes(q))) ||
        (it.summary && (it.summary.toLowerCase().includes(ql) || it.summary.includes(q)))
    );

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

// /health
app.get("/health", (req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => console.log(`✔ Backend running on port ${PORT}`));
