import express from "express";
import cors from "cors";
import Parser from "rss-parser";

const app = express();
const parser = new Parser();

app.use(cors());
app.use(express.json());

// RSS feeds (Hindi + English) - आप बाद में जोड़/हट कर सकते हैं
const FEEDS = [
  "https://rss.aajtak.in/rssfeed/120-India.xml",
  "https://feeds.bbci.co.uk/hindi/rss.xml",
  "https://timesofindia.indiatimes.com/rssfeedstopstories.cms",
  "https://www.indiatoday.in/rss/home"
];

// fallback sample (यदि live fetch fail हो)
const FALLBACK = [
  { id: "n1", title: "India launches new AI policy", summary: "Govt releases guidelines to boost AI transparency and local innovation.", link: "" },
  { id: "n2", title: "Monsoon updates", summary: "Heavy rains expected in coastal belts; farmers advised to prepare.", link: "" },
  { id: "n3", title: "Tech startup raises funds", summary: "A Bengaluru startup raised $5M for climate-tech product.", link: "" }
];

// Helper: fetch & parse all feeds (returns array of items)
async function fetchAllFeeds() {
  let all = [];
  for (const url of FEEDS) {
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
      // continue on error for this feed
      console.error("Feed error:", url, err && err.message);
    }
  }
  return all;
}

// Root
app.get("/", (req, res) => {
  res.json({ message: "QuickNewsGPT backend running ✅", endpoints: ["/news", "/ask"] });
});

// /news -> returns live items (top 20) or fallback
app.get("/news", async (req, res) => {
  try {
    const allNews = await fetchAllFeeds();
    if (!allNews || allNews.length === 0) {
      return res.json({ date: new Date().toISOString(), count: FALLBACK.length, news: FALLBACK });
    }
    return res.json({ date: new Date().toISOString(), count: allNews.length, news: allNews.slice(0, 20) });
  } catch (err) {
    console.error("Error /news:", err);
    return res.status(500).json({ error: "Error fetching news", fallback: FALLBACK });
  }
});

// /ask?q=keyword -> case-insensitive search in title + summary
app.get("/ask", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.status(400).json({ error: "Please provide a query." });

    // fetch current items (live)
    const allNews = await fetchAllFeeds();
    const source = (allNews && allNews.length > 0) ? allNews : FALLBACK;

    const ql = q.toLowerCase();
    const matched = source.filter(
      (it) =>
        (it.title && it.title.toLowerCase().includes(ql)) ||
        (it.summary && it.summary.toLowerCase().includes(ql))
    );

    return res.json({ query: q, count: matched.length, news: matched.slice(0, 20) });
  } catch (err) {
    console.error("Error /ask:", err);
    return res.status(500).json({ error: "Error searching news" });
  }
});

// simple health
app.get("/health", (req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => console.log(`✅ Backend running on port ${PORT}`));
