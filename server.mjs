import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import { load } from "cheerio";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 10000;

// --------------------------------------
// Helper: Scrape headlines from any URL
// --------------------------------------
async function scrapeNews(url, selector) {
  try {
    const html = await fetch(url).then(res => res.text());
    const $ = load(html);

    const results = [];

    $(selector).each((i, el) => {
      const title = $(el).text().trim();
      let link = $(el).attr("href");

      if (!title || !link) return;

      // Convert relative links to absolute
      if (!link.startsWith("http")) {
        link = url.replace(/\/$/, "") + (link.startsWith("/") ? "" : "/") + link;
      }

      results.push({
        title,
        url: link,
        source: url.replace("https://", "").replace(/\/.*$/, ""),
      });
    });

    return results;
  } catch (err) {
    console.log("Scrape error:", err);
    return [];
  }
}

// --------------------------------------
// International News (BBC Hindi + BBC World)
// --------------------------------------
app.get("/headline/international", async (req, res) => {
  const bbcHindi = await scrapeNews(
    "https://www.bbc.com/hindi",
    "a[href*='/hindi/articles']"
  );

  const bbcWorld = await scrapeNews(
    "https://www.bbc.com/news/world",
    "a.gs-c-promo-heading"
  );

  res.json([...bbcHindi, ...bbcWorld].slice(0, 20));
});

// --------------------------------------
// India News (NDTV + India Today)
// --------------------------------------
app.get("/headline/india", async (req, res) => {
  const ndtv = await scrapeNews(
    "https://www.ndtv.com/latest",
    "h2 a"
  );

  const indiaToday = await scrapeNews(
    "https://www.indiatoday.in/india",
    ".detail a"
  );

  res.json([...ndtv, ...indiaToday].slice(0, 20));
});

// --------------------------------------
// Rajasthan / State News (Rajasthan Patrika)
// --------------------------------------
app.get("/headline/rajasthan", async (req, res) => {
  // Updated selector for current Patrika structure
  const patrika = await scrapeNews(
    "https://www.patrika.com/rajasthan-news/",
    ".story-card a, .news-card a, article a"
  );

  res.json(patrika.slice(0, 20));
});

// --------------------------------------
// ASK NEWS (Smart Search)
// --------------------------------------
app.get("/ask", async (req, res) => {
  const q = req.query.q?.trim();
  if (!q) return res.json([]);

  const hindiQuery = await scrapeNews(
    `https://www.patrika.com/search/?q=${encodeURIComponent(q)}`,
    ".story-card a, .news-card a, article a"
  );

  const englishQuery = await scrapeNews(
    `https://www.ndtv.com/search?searchtext=${encodeURIComponent(q)}`,
    "h2 a"
  );

  res.json([...hindiQuery, ...englishQuery].slice(0, 20));
});

// --------------------------------------
// Start Server
// --------------------------------------
app.listen(PORT, () => {
  console.log("Free news server running on port " + PORT);
});
