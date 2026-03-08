const express = require('express');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', async (req, res) => {
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.json({ status: 'Wave Browser Proxy OK' });
  }

  let parsedUrl = targetUrl;
  if (!parsedUrl.startsWith('http')) {
    parsedUrl = 'https://' + parsedUrl;
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto(parsedUrl, { waitUntil: 'networkidle2', timeout: 15000 });

    const screenshot = await page.screenshot({ type: 'jpeg', quality: 80 });
    const title = await page.title();

    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]'))
        .slice(0, 20)
        .map(a => ({ url: a.href, text: a.innerText.trim().substring(0, 60) }))
        .filter(l => l.text && l.url.startsWith('http'));
    });

    await browser.close();

    res.json({
      title: title,
      url: parsedUrl,
      screenshot: screenshot.toString('base64'),
      links: links,
    });

  } catch (e) {
    if (browser) await browser.close();
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log('Wave Browser Proxy running on port ' + PORT);
});
