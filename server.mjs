import express from "express";
import cors from "cors";
import Parser from "rss-parser";
import fs from "fs";

const app = express();
const parser = new Parser();

app.use(cors());
app.use(express.json());

// RSS feeds (Hindi + English, category-wise)
const FEEDS = {
  India: [
    "https://rss.aajtak.in/rssfeed/120-India.xml",   // Hindi (AajTak)
    "https://www.indiatoday.in/rss/home",            // English
    "https://www.amarujala.com/rss/breaking-news.xml", // Hindi (Amar Ujala)
    "https://api.livehindustan.com/feeds/rss/latest/rssfeed.xml" // Hindi (Hindustan)
  ],
  Rajasthan: [
    "https://ndtv.in/rss/rajasthan-news",            // Hindi (NDTV India Rajasthan)
    "https://mhrnewsagency.com/rss/rajasthan.xml"    // Hindi (MHR News Rajasthan)
  ],
  Sports: [
    "https://www.aajtak.in/rssfeed/227-sports.xml",
    "https://timesofindia.indiatimes.com/rssfeeds/4719148.cms"
  ],
  Business: [
    "https://www.aajtak.in/rssfeed/228-business.xml",
    "https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms"
  ],
  Entertainment: [
    "https://www.aajtak.in/rssfeed/229-entertainment.xml",
    "https://timesofindia.indiatimes.com/rssfeeds/1081479906.cms"
  ],
  International: [
    "https://feeds.bbci.co.uk/news/world/rss.xml",
    "https://timesofindia.indiatimes.com/rssfeeds/296589292.cms"
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

// /news → category-wise news
// /news → category-wise news (alternate Hindi + English)
app.get("/news", async (req, res) => {
  try {
    const grouped = {};

    for (const cat of Object.keys(FEEDS)) {
      const urls = FEEDS[cat];

      // अगर category में सिर्फ़ एक feed है → normal fetch
      if (urls.length === 1) {
        const items = await fetchFeeds(urls);
        grouped[cat] = items.slice(0, 2);
      } else {
        // Hindi feed = पहला URL, English feed = दूसरा URL
        const hindiItems = await fetchFeeds([urls[0]]);
        const englishItems = await fetchFeeds([urls[1]]);

        // Alternate logic: पहले Hindi, फिर English
        grouped[cat] = [
          hindiItems[0] || englishItems[0],   // अगर Hindi नहीं है तो English
          englishItems[0] || hindiItems[1]    // अगर English नहीं है तो Hindi
        ].filter(Boolean); // null values हटाएँ
      }
    }

    return res.json({ date: new Date().toISOString(), news: grouped });
  } catch (err) {
    console.error("Error /news:", err);
    return res.status(500).json({ error: "Error fetching news", fallback: FALLBACK });
  }
});

// /ask → हिंदी + अंग्रेज़ी queries + fallback
app.get("/ask", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.status(400).json({ error: "Please provide a query." });

    let allNews = [];
    for (const cat of Object.keys(FEEDS)) {
      const items = await fetchFeeds(FEEDS[cat]);
      allNews = allNews.concat(items);
    }
    const source = (allNews && allNews.length > 0) ? allNews : FALLBACK;

    const ql = q.toLowerCase();
    let matched = source.filter(
      (it) =>
        (it.title && it.title.toLowerCase().includes(ql)) ||
        (it.summary && it.summary.toLowerCase().includes(ql))
    );

    // fallback logic
    if (matched.length === 0) {
      if (/jaipur|jodhpur|udaipur|rajasthan/i.test(q)) {
        matched = allNews.filter(n => /rajasthan/i.test(n.title));
      } else if (/delhi|mumbai|india|bharat/i.test(q)) {
        matched = allNews.filter(n => /india|delhi|mumbai/i.test(n.title));
      } else if (/world|us|china|russia/i.test(q)) {
        matched = allNews.filter(n => /world|us|china|russia/i.test(n.title));
      }
    }

    return res.json({ query: q, count: matched.length, news: matched.slice(0, 20) });
  } catch (err) {
    console.error("Error /ask:", err);
    return res.status(500).json({ error: "Error searching news" });
  }
});

// /custom (User Uploaded News)
app.get("/custom", async (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync("./public/custom-news.json", "utf-8"));
    res.json({ news: data });
  } catch (err) {
    console.error("Error /custom:", err);
    res.status(500).json({ error: "Failed to load custom news" });
  }
});

// /trending
app.get("/trending", async (req, res) => {
  try {
    const data = [
      { title: "India wins crucial cricket match", link: "https://www.espncricinfo.com/" },
      { title: "New AI policy announced by govt", link: "https://www.livemint.com/" },
      { title: "Bollywood movie breaks box office records", link: "https://www.bollywoodhungama.com/" },
      { title: "Global markets show recovery signs", link: "https://economictimes.indiatimes.com/" },
      { title: "Major tech launch excites youth", link: "https://www.gadgets360.com/" }
    ];
    res.json({ news: data });
  } catch (err) {
    res.status(500).json({ error: "Failed to load trending" });
  }
});

// /health
app.get("/health", (req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => console.log(`✔ Backend running on port ${PORT}`));
