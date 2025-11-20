import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// =========================
// Helper: Fetch News
// =========================

async function fetchNews(query) {
  try {
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&language=hi&apiKey=2a39547e93324e058ad06274cde01206`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.articles) return [];

    return data.articles
      .filter(a => a.title && a.url)
      .map(a => ({
        title: a.title,
        url: a.url,
        source: a.source?.name || "Unknown",
        publishedAt: a.publishedAt
      }));
  } catch (err) {
    console.error("Error fetching news:", err);
    return [];
  }
}

// =========================
// FIXED CATEGORY ENDPOINTS
// =========================

// 1. International
app.get("/headline/international", async (req, res) => {
  const keywords = ["World News", "International News", "Global Affairs"];
  const allNews = [];

  for (let q of keywords) {
    const news = await fetchNews(q);
    allNews.push(...news);
  }

  res.json(allNews.slice(0, 20)); // return 20 fresh headlines
});

// 2. India
app.get("/headline/india", async (req, res) => {
  const keywords = ["India News", "Indian Politics", "India Latest"];
  const allNews = [];

  for (let q of keywords) {
    const news = await fetchNews(q);
    allNews.push(...news);
  }

  res.json(allNews.slice(0, 20));
});

// 3. Rajasthan
app.get("/headline/rajasthan", async (req, res) => {
  const keywords = [
    "Rajasthan News",
    "Jaipur News",
    "Rajasthan Latest",
    "राजस्थान खबरें",
    "जयपुर समाचार"
  ];
  const allNews = [];

  for (let q of keywords) {
    const news = await fetchNews(q);
    allNews.push(...news);
  }

  res.json(allNews.slice(0, 20));
});

// =========================
// ASK NEWS ENDPOINT
// =========================

app.get("/ask", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.json([]);

  const englishQuery = query + " news latest India Rajasthan";
  const hindiQuery = query + " खबरें समाचार";

  const news1 = await fetchNews(englishQuery);
  const news2 = await fetchNews(hindiQuery);

  const combined = [...news1, ...news2];

  res.json(combined.slice(0, 20));
});

// =========================
// START SERVER
// =========================

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
