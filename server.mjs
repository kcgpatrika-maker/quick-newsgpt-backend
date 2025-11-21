import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 10000;

// ---------------------------
// Helper: Fetch news from API
// ---------------------------
async function fetchNews(query, lang = "hi") {
  try {
    const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=${lang}&token=YOUR_API_KEY`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.articles) return [];
    return data.articles.map(a => ({
      title: a.title,
      summary: a.description || "",
      link: a.url,
      source: a.source?.name || "Unknown",
      publishedAt: a.publishedAt
    }));
  } catch (err) {
    console.error("Fetch error:", err);
    return [];
  }
}

// ---------------------------
// Endpoints
// ---------------------------
app.get("/headline/international", async (req, res) => {
  const news = await fetchNews("world OR international", "en");
  res.json(news.slice(0, 20));
});

app.get("/headline/india", async (req, res) => {
  const news = await fetchNews("india OR politics", "en");
  res.json(news.slice(0, 20));
});

app.get("/headline/rajasthan", async (req, res) => {
  const news = await fetchNews("rajasthan OR jaipur", "hi");
  res.json(news.slice(0, 20));
});

app.get("/ask", async (req, res) => {
  const q = req.query.q?.trim();
  if (!q) return res.json([]);
  const hindiResults = await fetchNews(q, "hi");
  const engResults = await fetchNews(q, "en");
  res.json([...hindiResults, ...engResults].slice(0, 20));
});

// ---------------------------
// Start server
// ---------------------------
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
