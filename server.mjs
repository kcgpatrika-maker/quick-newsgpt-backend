import express from "express";
import cors from "cors";
import Parser from "rss-parser";
import fs from "fs";

const app = express();
const parser = new Parser();

app.use(cors());
app.use(express.json());

const ADMIN_PIN = "1336";

// RSS feeds (Hindi + English, category-wise)
const FEEDS = {
  International: [
    "https://api.livehindustan.com/feeds/rss/international/rssfeed.xml",
    "https://www.bbc.com/hindi/index.xml",
    "https://feeds.bbci.co.uk/news/world/rss.xml"
  ],
  India: [
    "https://www.amarujala.com/rss/breaking-news.xml",
    "https://api.livehindustan.com/feeds/rss/latest/rssfeed.xml",
    "https://www.bbc.com/hindi/index.xml",
    "https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms"
  ],
  Rajasthan: [
    "https://www.amarujala.com/rss/rajasthan.xml",
    "https://api.livehindustan.com/feeds/rss/rajasthan/rssfeed.xml"
  ],
  Sports: [
    "https://www.amarujala.com/rss/sports.xml",
    "https://api.livehindustan.com/feeds/rss/sports/rssfeed.xml",
    "https://timesofindia.indiatimes.com/rssfeeds/4719148.cms"
  ],
  Business: [
    "https://www.amarujala.com/rss/business.xml",
    "https://api.livehindustan.com/feeds/rss/business/rssfeed.xml",
    "https://www.livemint.com/rss/markets"
  ],
  Entertainment: [
    "https://www.amarujala.com/rss/entertainment.xml",
    "https://api.livehindustan.com/feeds/rss/entertainment/rssfeed.xml",
    "https://www.bollywoodhungama.com/rss/news.xml"
  ]
};
// fallback sample
const FALLBACK = [
  { id: "n1", title: "India launches new AI policy", link: "" },
  { id: "n2", title: "Monsoon updates", link: "" },
  { id: "n3", title: "Tech startup raises funds", link: "" }
];

// Helper: fetch & parse feeds
async function fetchFeeds(urls) {
  let all = [];
  for (const url of urls) {
    try {
      const feed = await parser.parseURL(url);
      if (Array.isArray(feed.items)) {
        feed.items.forEach((it, idx) => {
          all.push({
            id: it.guid || it.id || `${url}-${idx}`,
            title: it.title || "No title",
            summary: it.contentSnippet || it.summary || it.content || "",
            link: it.link || "",
            pubDate: it.pubDate || it.isoDate || null,
            source: new URL(url).hostname.replace("www.", "")
          });
        });
      }
    } catch (err) {
      console.error("Feed error:", url, err && err.message);
    }
  }
  return all;
}

// Root
app.get("/", (req, res) => {
  res.json({ message: "QuickNewsGPT backend running ✔", endpoints: ["/news", "/ask", "/custom", "/trending", "/health"] });
});

// /news → category-wise news (alternate Hindi + English, safe fallback)
app.get("/news", async (req, res) => {
  try {
    const grouped = {};
    for (const cat of Object.keys(FEEDS)) {
      const items = await fetchFeeds(FEEDS[cat]);
      // सिर्फ़ हिंदी headlines, दो‑दो
      grouped[cat] = items.slice(0, 2);
    }

    return res.json({ date: new Date().toISOString(), news: grouped });
  } catch (err) {
    console.error("Error /news:", err);
    return res.status(500).json({ error: "Error fetching news" });
  }
});

// /ask → Hindi/English queries
app.get("/ask", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.status(400).json({ error: "Please provide a query." });

    const isHindi = /[\u0900-\u097F]/.test(q);

    // Allowed keyword sets
const cities = [
  "जयपुर","दिल्ली","मुंबई","दौसा","कोटा","लखनऊ",
  "उदयपुर","भोपाल","पुणे","चेन्नई","हैदराबाद","बेंगलुरु"
];

const statesCountries = [
  "राजस्थान","उत्तर प्रदेश","मध्य प्रदेश","महाराष्ट्र","गुजरात",
  "भारत","अमेरिका","ईरान","चीन","पाकिस्तान","बांग्लादेश","नेपाल","इसराइल"
];

const topics = [
  "क्रिकेट","ipl","शेयर बाजार","फिल्म","त्योहार","राजनीति","चुनाव","आर्थिक संकट"
];

const leaders = [
  "मोदी","नरेंद्र मोदी","प्रधानमंत्री","ट्रंप","डोनाल्ड ट्रंप","राष्ट्रपति",
  "जो बाइडेन","मुख्यमंत्री","गृह मंत्री","विदेश मंत्री"
];

    let feedsToSearch = isHindi
      ? [
          "https://www.amarujala.com/rss/breaking-news.xml",
          "https://api.livehindustan.com/feeds/rss/latest/rssfeed.xml",
          "https://www.bbc.com/hindi/index.xml"
        ]
      : [
          "https://www.indiatoday.in/rss/home",
          "https://timesofindia.indiatimes.com/rssfeeds/4719148.cms",
          "https://feeds.bbci.co.uk/news/world/rss.xml"
        ];

    let allNews = await fetchFeeds(feedsToSearch);

    // Normalize function
    function normalize(text) {
      return (text || "")
        .toLowerCase()
        .replace(/[.,;:!?()'"“”‘’]/g, "")
        .trim();
    }

    const qNorm = normalize(q);

    // Expand query with keyword sets
    let qVariants = [qNorm];
    [...cities, ...statesCountries, ...topics].forEach((kw) => {
      if (qNorm.includes(normalize(kw))) {
        qVariants.push(normalize(kw));
      }
    });

    // Step 1: headlines में खोजें
    let matched = allNews.filter((it) => {
      const title = normalize(it.title);
      return qVariants.some((kw) => title.includes(kw));
    });

    // Step 2: अगर headlines में नहीं मिला तो summaries/description/contentSnippet में खोजें
    if (matched.length === 0) {
      matched = allNews.filter((it) => {
        const summary = normalize(it.summary);
        const description = normalize(it.description);
        const content = normalize(it.contentSnippet || it.content);
        return qVariants.some(
          (kw) =>
            summary.includes(kw) ||
            description.includes(kw) ||
            content.includes(kw)
        );
      });
    }

    return res.json({
      query: q,
      count: matched.length,
      news: matched.slice(0, 20)
    });
  } catch (err) {
    console.error("Error /ask:", err);
    return res.status(500).json({ error: "Error searching news" });
  }
});

// Gold & Silver RSS endpoint
app.get("/goldsilver", async (req, res) => {
  try {
    const feedUrl = "https://www.oneindia.com/rss/business.xml"; // OneIndia Business RSS
    const feed = await parser.parseURL(feedUrl);

    // पहला item लीजिए जिसमें गोल्ड-सिल्वर का डेटा होता है
    const item = feed.items.find(i =>
      i.title.toLowerCase().includes("gold") || i.title.toLowerCase().includes("silver")
    );

    if (!item) {
      return res.json({ error: "No gold/silver data found in RSS" });
    }

    // description से rates निकालना (सिंपल regex / split से)
    const desc = item.description;

    // उदाहरण regex (आपके दिए टेबल के हिसाब से)
    const gold24 = desc.match(/24K[^₹]*₹([\d,]+)/);
    const gold22 = desc.match(/22K[^₹]*₹([\d,]+)/);
    const silverGram = desc.match(/Per Gram[^₹]*₹([\d,.]+)/);
    const silver10 = desc.match(/Per 10 Grams[^₹]*₹([\d,.]+)/);
    const silverKg = desc.match(/Per KG[^₹]*₹([\d,.]+)/);

    res.json({
      source: "OneIndia RSS",
      date: item.pubDate,
      gold: {
        "24K": gold24 ? `₹${gold24[1]}/gm` : "N/A",
        "22K": gold22 ? `₹${gold22[1]}/gm` : "N/A"
      },
      silver: {
        "1gm": silverGram ? `₹${silverGram[1]}` : "N/A",
        "10gm": silver10 ? `₹${silver10[1]}` : "N/A",
        "1kg": silverKg ? `₹${silverKg[1]}` : "N/A"
      }
    });
  } catch (err) {
    console.error("GoldSilver RSS error:", err);
    res.status(500).json({ error: "Failed to fetch gold/silver rates" });
  }
});

// /health
app.get("/health", (req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => console.log(`✔ Backend running on port ${PORT}`));
