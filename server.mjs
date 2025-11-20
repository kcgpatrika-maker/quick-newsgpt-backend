// server.mjs
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 10000;

// -------------------------------
// Helper: Scrape news from URL
// -------------------------------
async function scrapeNews(url, selector, base = "") {
  try {
    const res = await fetch(url);
    const html = await res.text();
    const $ = cheerio.load(html);

    const results = [];
    $(selector).each((i, el) => {
      const title = $(el).text().trim();
      const link = $(el).attr("href");
      if (!title || !link) return;
      results.push({
        title,
        url: link.startsWith("http") ? link : (base || url) + link,
        source: url.replace(/^https?:\/\//, ""),
        summary: "No summary available.",
      });
    });
    return results;
  } catch (err) {
    console.error("Scrape error:", err);
    return [];
  }
}

// -------------------------------
// International News (BBC Hindi + BBC World)
// -------------------------------
app.get("/headline/international", async (req, res) => {
  const bbcHindi = await scrapeNews(
    "https://www.bbc.com/hindi",
    "a[href*='/hindi/articles']",
    "https://www.bbc.com"
  );
  const bbcWorld = await scrapeNews(
    "https://www.bbc.com/news/world",
    "a.gs-c-promo-heading",
    "https://www.bbc.com"
  );
  res.json([...bbcHindi, ...bbcWorld].slice(0, 20));
});

// -------------------------------
// India News (NDTV + India Today)
// -------------------------------
app.get("/headline/india", async (req, res) => {
  const ndtv = await scrapeNews(
    "https://www.ndtv.com/latest",
    "h2 a",
    "https://www.ndtv.com"
  );
  const indiaToday = await scrapeNews(
    "https://www.indiatoday.in/india",
    ".detail a",
    "https://www.indiatoday.in"
  );
  res.json([...ndtv, ...indiaToday].slice(0, 20));
});

// -------------------------------
// Rajasthan/State News (Rajasthan Patrika)
// -------------------------------
app.get("/headline/rajasthan", async (req, res) => {
  const patrika = await scrapeNews(
    "https://www.patrika.com/rajasthan-news/",
    ".news-card a",
    "https://www.patrika.com"
  );
  res.json(patrika.slice(0, 20));
});

// -------------------------------
// Ask News Endpoint
// -------------------------------
app.get("/ask", async (req, res) => {
  const q = req.query.q?.trim();
  if (!q) return res.json([]);

  const hindiQuery = await scrapeNews(
    `https://www.patrika.com/search/?q=${encodeURIComponent(q)}`,
    ".news-card a",
    "https://www.patrika.com"
  );
  const englishQuery = await scrapeNews(
    `https://www.ndtv.com/search?searchtext=${encodeURIComponent(q)}`,
    "h2 a",
    "https://www.ndtv.com"
  );

  res.json([...hindiQuery, ...englishQuery].slice(0, 20));
});

// -------------------------------
// Start server
// -------------------------------
app.listen(PORT, () => {
  console.log("News scraping server running on port " + PORT);
});
