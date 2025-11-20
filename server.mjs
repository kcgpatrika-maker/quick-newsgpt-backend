import express from "express";
import cors from "cors";
import Parser from "rss-parser";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;
const rss = new Parser();

// Helper: Fetch RSS feed
async function fetchRSS(url) {
  try {
    const feed = await rss.parseURL(url);
    return feed.items.map(item => ({
      title: item.title,
      url: item.link,
      source: feed.title
    }));
  } catch (err) {
    console.log("RSS error:", err);
    return [];
  }
}

// ============================
// International Headlines
// ============================
app.get("/headline/international", async (req, res) => {
  const BBC = await fetchRSS("https://feeds.bbci.co.uk/news/world/rss.xml");
  const BBC_Hindi = await fetchRSS("https://feeds.bbci.co.uk/hindi/rss.xml");

  res.json([...BBC_Hindi, ...BBC].slice(0, 20));
});

// ============================
// India Headlines
// ============================
app.get("/headline/india", async (req, res) => {
  const NDTV = await fetchRSS("https://feeds.feedburner.com/ndtvnews-india-news");
  const IndiaToday = await fetchRSS("https://www.indiatoday.in/rss/home");

  res.json([...NDTV, ...IndiaToday].slice(0, 20));
});

// ============================
// Rajasthan Headlines
// ============================
app.get("/headline/rajasthan", async (req, res) => {
  const Patrika = await fetchRSS("https://www.patrika.com/rss/rajasthan-news.xml");

  res.json(Patrika.slice(0, 20));
});

// ============================
// Ask News
// ============================
app.get("/ask", async (req, res) => {
  const q = req.query.q?.trim();
  if (!q) return res.json([]);

  const IndiaToday = await fetchRSS("https://www.indiatoday.in/rss/home");
  const NDTV = await fetchRSS("https://feeds.feedburner.com/ndtvnews-india-news");
  const Patrika = await fetchRSS("https://www.patrika.com/rss/rajasthan-news.xml");

  const all = [...IndiaToday, ...NDTV, ...Patrika];

  const filtered = all.filter(item =>
    item.title?.toLowerCase().includes(q.toLowerCase())
  );

  res.json(filtered.slice(0, 20));
});

// ============================
// Start Server
// ============================
app.listen(PORT, () => {
  console.log("API-free RSS News Server running on port " + PORT);
});
