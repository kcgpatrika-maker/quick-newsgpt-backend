import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import cheerio from "cheerio";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// ---------------------------
// Helper: Scrape News
// ---------------------------
async function scrapeNews(url, selector) {
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
        url: link.startsWith("http") ? link : url + link,
        source: url.replace("https://", "").replace(/\/.*$/,""),
      });
    });

    return results;
  } catch (err) {
    console.error("Scrape error:", err);
    return [];
  }
}

// ---------------------------
// International News (BBC Hindi + BBC World)
// ---------------------------
app.get("/headline/international", async (req, res) => {
  try {
    const bbcHindi = await scrapeNews(
      "https://www.bbc.com/hindi",
      "a[href*='/hindi/articles']"
    );
    const bbcWorld = await scrapeNews(
      "https://www.bbc.com/news/world",
      "a.gs-c-promo-heading"
    );
    res.json([...bbcHindi, ...bbcWorld].slice(0, 20));
  } catch(err) {
    console.error("International scrape failed:", err);
    res.json([]);
  }
});

// ---------------------------
// India News (NDTV + India Today)
// ---------------------------
app.get("/headline/india", async (req, res) => {
  try {
    const ndtv = await scrapeNews(
      "https://www.ndtv.com/latest",
      "h2 a"
    );
    const indiaToday = await scrapeNews(
      "https://www.indiatoday.in/india",
      ".detail a"
    );
    res.json([...ndtv, ...indiaToday].slice(0, 20));
  } catch(err) {
    console.error("India scrape failed:", err);
    res.json([]);
  }
});

// ---------------------------
// Rajasthan / State News (Patrika)
// ---------------------------
app.get("/headline/rajasthan", async (req, res) => {
  try {
    const patrika = await scrapeNews(
      "https://www.patrika.com/rajasthan-news/",
      ".news-card a, .news-item a, .newslist a"
    );

    // prioritize Jaipur news
    const jaipurNews = patrika.filter(item =>
      /jaipur|जयपुर/i.test(item.title)
    );
    const otherNews = patrika.filter(item =>
      !/jaipur|जयपुर/i.test(item.title)
    );

    res.json([...jaipurNews, ...otherNews].slice(0, 20));
  } catch(err) {
    console.error("Rajasthan scrape failed:", err);
    res.json([]);
  }
});

// ---------------------------
// Ask News endpoint
// ---------------------------
app.get("/ask", async (req, res) => {
  const q = req.query.q?.trim();
  if (!q) return res.json([]);

  try {
    const hindiQuery = await scrapeNews(
      `https://www.patrika.com/search/?q=${encodeURIComponent(q)}`,
      ".news-card a, .news-item a, .newslist a"
    );

    let englishQuery = [];
    try {
      englishQuery = await scrapeNews(
        `https://www.ndtv.com/search?searchtext=${encodeURIComponent(q)}`,
        "h2 a"
      );
    } catch(e) { console.warn("NDTV ask failed:", e); }

    res.json([...hindiQuery, ...englishQuery].slice(0, 20));
  } catch(err) {
    console.error("Ask scrape failed:", err);
    res.json([]);
  }
});

// ---------------------------
// Start Server
// ---------------------------
app.listen(PORT, () => {
  console.log("API-free news server running on port " + PORT);
});
