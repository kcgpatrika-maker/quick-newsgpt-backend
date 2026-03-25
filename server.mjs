import express from "express";
import cors from "cors";
import Parser from "rss-parser";
import fs from "fs";

const app = express();
const parser = new Parser();

app.use(cors());
app.use(express.json());

// RSS Feeds
const feeds = [
  { category: "International", url: "https://rss.cnn.com/rss/edition_world.rss" },
  { category: "India", url: "https://feeds.bbci.co.uk/news/world/asia/india/rss.xml" },
  { category: "Rajasthan", url: "https://rajasthanpatrika.patrika.com/rss/rajasthan.xml" },
  { category: "Business", url: "https://feeds.bbci.co.uk/news/business/rss.xml" },
  { category: "Sports", url: "https://feeds.bbci.co.uk/sport/rss.xml" },
  { category: "Entertainment", url: "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml" }
];

// Helper: fetch RSS
async function fetchFeed(url, category) {
  try {
    const feed = await parser.parseURL(url);
    return feed.items.slice(0, 5).map((item, idx) => ({
      id: `${category}-${idx}`,
      category,
      title: item.title,
      summary: item.contentSnippet || item.content || "",
      link: item.link,
      source: feed.title,
      pubDate: item.pubDate
    }));
  } catch {
    return [];
  }
}

// Endpoint: News
app.get("/news", async (req, res) => {
  const results = {};
  for (let f of feeds) {
    results[f.category] = await fetchFeed(f.url, f.category);
  }
  res.json(results);
});

// Endpoint: Ask (keyword search)
app.get("/ask", async (req, res) => {
  const q = (req.query.q || "").toLowerCase();
  const results = [];
  for (let f of feeds) {
    const items = await fetchFeed(f.url, f.category);
    results.push(...items.filter(it => it.title.toLowerCase().includes(q) || it.summary.toLowerCase().includes(q)));
  }
  res.json({ news: results });
});

// Endpoint: Custom User News
app.get("/custom", async (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync("./public/custom-news.json", "utf-8"));
    res.json({ news: data });
  } catch {
    res.status(500).json({ error: "Failed to load custom news" });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => console.log(`âœ… Backend running on port ${PORT}`));
