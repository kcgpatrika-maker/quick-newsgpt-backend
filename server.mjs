import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import * as cheerio from "cheerio"; // ESM import

const app = express();
app.use(cors());

const PORT = process.env.PORT || 10000;

// ------------------------------
// Helper: scrape headlines from URL
// ------------------------------
async function scrapeNews(url, selector, base = "") {
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const html = await res.text();
    const $ = cheerio.load(html);

    const results = [];
    $(selector).each((i, el) => {
      const title = $(el).text().trim();
      let link = $(el).attr("href");
      if (!title || !link) return;
      if (!link.startsWith("http")) link = base + link;
      results.push({ title, url: link, source: url });
    });
    return results;
  } catch (err) {
    console.error("Scrape error:", url, err);
    return [];
  }
}

// ------------------------------
// /international
// ------------------------------
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

// ------------------------------
// /india
// ------------------------------
app.get("/headline/india", async (req, res) => {
  const ndtv = await scrapeNews("https://www.ndtv.com/latest", "h2 a");
  const indiaToday = await scrapeNews("https://www.indiatoday.in/india", ".detail a");
  res.json([...ndtv, ...indiaToday].slice(0, 20));
});

// ------------------------------
// /rajasthan
// ------------------------------
app.get("/headline/rajasthan", async (req, res) => {
  const patrika = await scrapeNews("https://www.patrika.com/rajasthan-news/", ".news-card a");
  res.json(patrika.slice(0, 20));
});

// ------------------------------
// /ask?q=
// ------------------------------
app.get("/ask", async (req, res) => {
  const q = req.query.q?.trim();
  if (!q) return res.json([]);

  const hindi = await scrapeNews(
    `https://www.patrika.com/search/?q=${encodeURIComponent(q)}`,
    ".news-card a"
  );
  const english = await scrapeNews(
    `https://www.ndtv.com/search?searchtext=${encodeURIComponent(q)}`,
    "h2 a"
  );

  res.json([...hindi, ...english].slice(0, 20));
});

// ------------------------------
// Start Server
// ------------------------------
app.listen(PORT, () => {
  console.log("Free news server running on port", PORT);
});
