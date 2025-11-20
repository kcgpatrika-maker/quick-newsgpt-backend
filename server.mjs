async function fetchNews(query) {
  try {
    const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(
      query
    )}&lang=hi&country=in&max=10&apikey=c403701ba471121fbc8fe75902a93b54`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.articles) return [];

    return data.articles
      .filter(a => a.title && a.url)
      .map(a => ({
        title: a.title,
        summary: a.description,
        url: a.url,
        source: a.source?.name || "Unknown",
        publishedAt: a.publishedAt
      }));
  } catch (err) {
    console.error("Error fetching news:", err);
    return [];
  }
}
