import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;
const GNEWS_API_KEY = process.env.GNEWS_API_KEY;

// =============================
// Helper - Fetch GNews
// =============================
async function fetchGNews(query) {
  try {
    const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=hi&max=20&apikey=${GNEWS_API_KEY}`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data.articles) return [];

    return data.articles.map(a => ({
      title: a.title,
      description: a.description,
      url: a.url,
      source: a.source?.name || "Unknown",
      image: a.image,
      publishedAt: a.publishedAt
    }));
  } catch (err) {
    console.error("GNews Fetch Error:", err);
    return [];
  }
}

// =============================
// FIXED CATEGORY ENDPOINTS
// =============================

// 1. International
app.get("/headline/international", async (req, res) => {
  const queries = ["world", "international", "global affairs"];
  let all = [];

  for (const q of queries) {
    all.push(...await fetchGNews(q));
  }

  res.json(all.slice(0, 20));
});

// 2. India
app.get("/headline/india", async (req, res) => {
  const queries = ["India news", "Indian politics", "भारत समाचार"];
  let all = [];

  for (const q of queries) {
    all.push(...await fetchGNews(q));
  }

  res.json(all.slice(0, 20));
});

// 3. Rajasthan
app.get("/headline/rajasthan", async (req, res) => {
  const queries = ["Rajasthan news", "Jaipur news", "राजस्थान", "जयपुर"];
  let all = [];

  for (const q of queries) {
    all.push(...await fetchGNews(q));
  }

  res.json(all.slice(0, 20));
});

// =============================
// ASK endpoint
// =============================
app.get("/ask", async (req, res) => {
  const q = req.query.q;
  if (!q) return res.json([]);

  const combined = [
    ...(await fetchGNews(q)),
    ...(await fetchGNews(q + " India")),
    ...(await fetchGNews(q + " Rajasthan"))
  ];

  res.json(combined.slice(0, 20));
});

// =============================
// Start server
// =============================
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
