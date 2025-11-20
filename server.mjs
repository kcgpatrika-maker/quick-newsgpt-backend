import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import * as cheerio from "cheerio"; // ESM compatible import

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// ----------------------------
// Helper: Scrape news
// ----------------------------
async function scrapeNews(url, selector) {
  try {
    const html = await fetch(url).then(res => res.text());
    const $ = cheerio.load(html);

    const results = [];

    $(selector).each((i, el) => {
      const title = $(el).text().trim();
      let link = $(el).attr("href");
      if (!title || !link) return;
      if (!link.startsWith("http")) link = new URL(link, url).href;

      results.push({ title, url: link, source: url.replace(/^https?:\/\//, "") });
    });

    return results;
  } catch (err) {
    console.error("Scrape error:", err);
    return [];
  }
}

// ----------------------------
// International (BBC Hindi + BBC)
// ----------------------------
app.get("/headline/international", async (req, res) => {
  const bbcHindi = await scrapeNews("https://www.bbc.com/hindi", "a[href*='/hindi/articles']");
  const bbcWorld = await scrapeNews("https://www.bbc.com/news/world", "a.gs-c-promo-heading");
  res.json([...bbcHindi, ...bbcWorld].slice(0, 20));
});

// ----------------------------
// India (NDTV + India Today)
// ----------------------------
app.get("/headline/india", async (req, res) => {
  const ndtv = await scrapeNews("https://www.ndtv.com/latest", "h2 a");
  const indiaToday = await scrapeNews("https://www.indiatoday.in/india", ".detail a");
  res.json([...ndtv, ...indiaToday].slice(0, 20));
});

// ----------------------------
// Rajasthan / State (Patrika)
// ----------------------------
app.get("/headline/rajasthan", async (req, res) => {
  const patrika = await scrapeNews("https://www.patrika.com/rajasthan-news/", ".news-card a");
  // Jaipur first
  const sorted = patrika.sort((a, b) => {
    const aJaipur = /jaipur|जयपुर/i.test(a.title);
    const bJaipur = /jaipur|जयपुर/i.test(b.title);
    return (aJaipur === bJaipur) ? 0 : aJaipur ? -1 : 1;
  });
  res.json(sorted.slice(0, 20));
});

// ----------------------------
// Ask News
// ----------------------------
app.get("/ask", async (req, res) => {
  const q = req.query.q?.trim();
  if (!q) return res.json([]);

  const hindiQuery = await scrapeNews(`https://www.patrika.com/search/?q=${encodeURIComponent(q)}`, ".news-card a");
  const englishQuery = await scrapeNews(`https://www.ndtv.com/search?searchtext=${encodeURIComponent(q)}`, "h2 a");

  const combined = [...hindiQuery, ...englishQuery];
  res.json(combined.slice(0, 20));
});

// ----------------------------
// Start server
// ----------------------------
app.listen(PORT, () => {
  console.log("QuickNewsGPT API running on port " + PORT);
});
