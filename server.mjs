import express from "express";
import cors from "cors";
import Parser from "rss-parser";

const app = express();
app.use(cors());

const parser = new Parser();
const PORT = process.env.PORT || 3000;

// ---------------------------
// Helper: Fetch RSS
// ---------------------------
async function getRSS(url) {
  try {
    const feed = await parser.parseURL(url);
    return feed.items.map(item => ({
      title: item.title || "",
      url: item.link || "",
      source: feed.title || "News",
      description: item.contentSnippet || "",
      publishedAt: item.pubDate || ""
    }));
  } catch (err) {
    console.error("RSS error:", err);
    return [];
  }
}

// ---------------------------
// International News
// ---------------------------
app.get("/headline/international", async (req, res) => {
  const list1 = await getRSS("https://feeds.bbci.co.uk/news/world/rss.xml");
  const list2 = await getRSS("https://feeds.bbci.co.uk/hindi/rss.xml");
  res.json([...list1, ...list2].slice(0, 20));
});

// ---------------------------
// India News
// ---------------------------
app.get("/headline/india", async (req, res) => {
  const list1 = await getRSS("https://feeds.feedburner.com/ndtvnews-india-news");
  const list2 = await getRSS("https://www.indiatoday.in/rss/home");
  res.json([...list1, ...list2].slice(0, 20));
});

// --------------------------------------
// Rajasthan News (BBC Hindi – Filtered)
// --------------------------------------
app.get("/headline/rajasthan", async (req, res) => {
  const data = await fetchRSS("https://feeds.bbci.co.uk/hindi/rss.xml");

  const keywords = [
    "राजस्थान",
    "जयपुर",
    "उदयपुर",
    "जोधपुर",
    "कोटा",
    "अजमेर",
    "भीलवाड़ा",
    "बूंदी",
    "चित्तौड़गढ़",
    "श्रीगंगानगर",
    "हनुमानगढ़",
    "बीकानेर",
    "झुंझुनूं",
    "सीकर",
    "अलवर",
    "भरतपुर",
    "पाली",
    "टोंक",
    "बारां",
    "बांसवाड़ा",
    "डूंगरपुर",
    "प्रतापगढ़",
    "राजसमंद",
    "धौलपुर",
    "जैसलमेर",
    "बारमेर",
    "सवाई माधोपुर",
    "करौली"
  ];

  const filtered = data.filter(a =>
    keywords.some(kw => a.title.includes(kw) || (a.summary && a.summary.includes(kw)))
  );

  res.json(filtered.slice(0, 20));
});

// ---------------------------
// Ask News
// ---------------------------
app.get("/ask", async (req, res) => {
  const q = req.query.q?.trim();
  if (!q) return res.json([]);

  const hindi = await getRSS("https://feeds.bbci.co.uk/hindi/rss.xml");
  const india = await getRSS("https://feeds.feedburner.com/ndtvnews-india-news");

  const match = [...hindi, ...india].filter(item =>
    item.title.toLowerCase().includes(q.toLowerCase()) ||
    item.description.toLowerCase().includes(q.toLowerCase())
  );

  res.json(match.slice(0, 20));
});

// ---------------------------
app.listen(PORT, () => {
  console.log("RSS News API running on port " + PORT);
});
