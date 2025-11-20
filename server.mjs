import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import cheerio from "cheerio";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// ----------------------------
// Helper: Scrape news from URL
// ----------------------------
async function scrapeNews(url, selector, base = "") {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
                      "AppleWebKit/537.36 (KHTML, like Gecko) " +
                      "Chrome/119.0.0.0 Safari/537.36"
      },
      timeout: 10000
    });
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
        summary: "No summary available."
      });
    });
    return results;
  } catch (err) {
    console.log("Scrape error:", url, err.message || err);
    return [];
  }
}

// ----------------------------
// International News
// ----------------------------
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

  res.json([...bbcHindi
