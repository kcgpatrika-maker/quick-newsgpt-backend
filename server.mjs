import express from "express";
import cors from "cors";
import Parser from "rss-parser";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;
const rssParser = new Parser();

// Helper: Fetch RSS feed items
async function fetchRSS(url) {
  try {
    const feed = await rssParser.parseURL(url);
    return feed.items.map(item => ({
      title: item.title,
      url: item.link,
      source: feed.title
    }));
  } catch (err) {
    console.error("RSS fetch error:", err);
    return [];
  }
}

app.get("/headline/international", async (req, res) => {
  const bbcWorld = await fetchRSS("https://feeds.bbci.co.uk/news/world/rss.xml");
  const bbcHindi = await fetchRSS("https://feeds.bbci.co.uk/hindi/rss.xml");
  res.json([...bbcWorld, ...bbcHindi].slice(0, 20));
});

app.get("/headline/india", async (req, res) => {
  const ndtv = await fetchRSS("https://feeds.feedburner.com/ndtvnews-india-news");
  const indiaToday = await fetchRSS("https://www.indiatoday.in/rss/home");
  res.json([...ndtv, ...indiaToday].slice(0, 20));
});

app.get("/headline/rajasthan", async (req, res) => {
  const patrika = await fetchRSS("https://www.patrika.com/rss/rajasthan-news.xml");
  res.json(patrika.slice(0, 20));
});

app.get("/ask", async (req, res) => {
  const q = req.query.q?.trim();
  if (!q) return res.json([]);

  const allFeeds = [
    "https://www.indiatoday.in/rss/home",
    "https://feeds.feedburner.com/ndtvnews-india-news",
    "https://www.patrika.com/rss/rajasthan-news.xml"
  ];

  const promises = allFeeds.map(url => fetchRSS(url));
  const results = await Promise.all(promises);
  const flat = results.flat();
  const filtered = flat.filter(item =>
    item.title?.toLowerCase().includes(q.toLowerCase())
  );

  res.json(filtered.slice(0, 20));
});

app.listen(PORT, () => {
  console.log("API-free RSS news server running on port " + PORT);
});
