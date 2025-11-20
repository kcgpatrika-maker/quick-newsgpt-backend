// server.mjs
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import cheerio from "cheerio";
import Parser from "rss-parser";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;
const parser = new Parser();

// -----------------------------
// Helper: Scrape headlines
// -----------------------------
async function scrapeNews(url, selector, baseUrl) {
  try {
    const html = await fetch(url).then(res => res.text());
    const $ = cheerio.load(html);
    const results = [];

    $(selector).each((i, el) => {
      const title = $(el).text().trim();
      const link = $(el).attr("href");
      if (!title || !link) return;

      results.push({
        title,
        url: link.startsWith("http") ? link : (baseUrl || url) + link,
        source: url.replace("https://", "").split("/")[0],
      });
    });

    return results;
  } catch (err) {
    console.error("Scrape error:", err);
    return [];
  }
}

// -----------------------------
// Helper: Fetch RSS news
// -----------------------------
async function fetchRSS(url) {
  try {
    const feed = await parser.parseURL(url);
    return feed.items.map(item => ({
      title: item.title,
      url: item.link,
      source: feed.title,
      publishedAt: item.pubDate,
    }));
  } catch (err) {
    console.error("RSS fetch error:", err);
    return [];
  }
}

// -----------------------------
// Routes
// -----------------------------

// International News
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

// India News
app.get("/headline/india", async (req, res) => {
  const ndtv = await scrapeNews("https://www.ndtv.com/latest", "h2 a");
  const indiaToday = await scrapeNews("https://www.indiatoday.in/india", ".detail a");

  res.json([...ndtv, ...indiaToday].slice(0, 20));
});

// Rajasthan / State News
app.get("/headline/rajasthan", async (req, res) => {
  const patrika = await scrapeNews("https://www.patrika.com/rajasthan-news/", ".news-card a");
  res.json(patrika.slice(0, 20));
});

// Ask section
app.get("/ask", async (req, res) => {
  const q = req.query.q?.trim();
  if (!q) return res.json([]);

  const hindiQuery = await scrapeNews(
    `https://www.patrika.com/search/?q=${encodeURIComponent(q)}`,
    ".news-card a"
  );

  const englishQuery = await scrapeNews(
    `https://www.ndtv.com/search?searchtext=${encodeURIComponent(q)}`,
    "h2 a"
  );

  res.json([...hindiQuery, ...englishQuery].slice(0, 20));
});

// -----------------------------
// Start server
// -----------------------------
app.listen(PORT, () => {
  console.log("Free scraping news server running on port " + PORT);
});
