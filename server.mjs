// server.mjs - stable old version
import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 10000;

// ---------------------------
// Helper: Fetch news from NewsAPI (stable working free API)
// ---------------------------
async function fetchNews(query) {
  try {
    // Old working free API
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&apiKey=2a39547e93324e058ad06274cde01206`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.articles) return [];
    return data.articles.map(a => ({
      title: a.title,
      url: a.url,
      source: a.source?.name || "Unknown",
      summary: a.description || "",
      publishedAt: a.publishedAt
    }));
  } catch (err) {
    console.error("Error fetching news:", err);
    return [];
  }
}

// ---------------------------
// Fixed category endpoints
// ---------------------------
app.get("/headline/international", async (req, res) => {
  const news = await fetchNews("world OR international");
  res.json(news.slice(0, 20));
});

app.get("/headline/india", async (req, res) => {
  const news = await fetchNews("india OR bharat");
  res.json(news.slice(0, 20));
});

app.get("/headline/rajasthan", async (req, res) => {
  const news = await fetchNews("rajasthan OR jaipur");
  res.json(news.slice(0, 20));
});

// ---------------------------
// Ask endpoint
// ---------------------------
app.get("/ask", async (req, res) => {
  const q = req.query.q;
  if (!q) return res.json([]);
  const news = await fetchNews(q);
  res.json(news.slice(0, 20));
});

// ---------------------------
// Start server
// ---------------------------
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
