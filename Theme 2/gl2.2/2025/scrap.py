# -*- coding: utf-8 -*-
"""
Selenium scraper for ZSU daily briefs with basic anti-detection measures.
Save as zsu_selenium.py and run from a virtualenv where dependencies are installed.

pip install selenium webdriver-manager bs4 lxml pandas
"""

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from bs4 import BeautifulSoup
from urllib.parse import urljoin
from datetime import datetime, timedelta, timezone
import time, random, re, pandas as pd

KYIV_TZ = timezone(timedelta(hours=3))
START_URL = "https://www.zsu.gov.ua/news/operatyvna-informatsiia-stanom-na-0800-20102025-shchodo-rosiiskoho-vtorhnennia"
DAYS_BACK = 30
MAX_PAGES = DAYS_BACK * 2  # safety cap

def make_driver(user_data_dir=None, proxy=None):
    options = Options()

    # Visible browser is less detectable while developing; change to headless if needed
    # options.add_argument("--headless=new")
    options.add_argument("--window-size=1200,2000")

    # Basic "human" tweaks
    options.add_argument("--lang=uk-UA")
    ua = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
          "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    options.add_argument(f"user-agent={ua}")
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option("useAutomationExtension", False)

    if user_data_dir:
        options.add_argument(f"--user-data-dir={user_data_dir}")

    if proxy:
        options.add_argument(f'--proxy-server={proxy}')

    # disable automation-controlled flag (attempt)
    # Note: not a guarantee vs advanced bot detection.
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)

    # further JS tweaks to reduce navigator.webdriver and small fingerprints
    try:
        driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
            "source": """
Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
window.chrome = { runtime: {} };
Object.defineProperty(navigator, 'languages', {get: () => ['uk-UA','uk','en-US','en']});
Object.defineProperty(navigator, 'plugins', {get: () => [1,2,3,4,5]});
"""
        })
    except Exception:
        # If CDP not available, ignore
        pass

    return driver

def clean_text(t):
    return re.sub(r"\s+\n", "\n", re.sub(r"[ \t]+", " ", (t or "") )).strip()

def extract_article_text(soup):
    main = soup.find("main") or soup
    article = main.find("article")
    if article:
        parts = [p.get_text(" ", strip=True) for p in article.find_all("p")]
        txt = "\n".join([p for p in parts if p])
    else:
        parts = [p.get_text(" ", strip=True) for p in main.find_all("p")]
        txt = "\n".join([p for p in parts if p])
    txt = re.split(r"Чит(а|а)йте також", txt, flags=re.IGNORECASE)[0]
    return clean_text(txt)

def find_prev_day_links(soup, base_url):
    links = []
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if "operatyvna-informatsiia" in href and "shchodo-rosiiskoho-vtorhnennia" in href:
            links.append(urljoin(base_url, href))
    # unique preserve order
    seen = set(); out=[]
    for u in links:
        if u not in seen:
            seen.add(u); out.append(u)
    return out

def parse_page_html(html, url):
    soup = BeautifulSoup(html, "lxml")
    title_el = soup.find(["h1","h2"])
    title = title_el.get_text(" ", strip=True) if title_el else ""
    text = extract_article_text(soup)
    return {"url": url, "title": title, "text": text, "soup": soup}

def human_wait(min_s=0.8, max_s=2.0):
    time.sleep(random.uniform(min_s, max_s))

def main():
    driver = make_driver()
    try:
        rows=[]
        visited=set()
        queue=[START_URL]
        while queue and len(rows) < DAYS_BACK and len(visited) < MAX_PAGES:
            url = queue.pop(0)
            if url in visited: 
                continue
            visited.add(url)

            try:
                driver.get(url)
            except Exception as e:
                print(f"[WARN] driver.get failed for {url}: {e}")
                continue

            # wait a bit for JS content to render
            try:
                WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.TAG_NAME, "body")))
            except Exception:
                pass

            html = driver.page_source
            res = parse_page_html(html, url)
            soup = res.pop("soup")

            # try to parse date from title or h1
            m = re.search(r"(\d{1,2})[.\-](\d{1,2})[.\-](\d{2,4})", (res["title"] or ""))
            date_slug = ""
            if m:
                dd, mm, yy = m.groups()
                yy = "20"+yy if len(yy)==2 else yy
                try:
                    date_slug = datetime(int(yy), int(mm), int(dd)).date().isoformat()
                except Exception:
                    date_slug = ""

            res["date_slug"] = date_slug
            rows.append(res)
            print(f"[OK] fetched: {url} (date: {date_slug or 'no-date'})")

            # find previous day links
            prev_links = find_prev_day_links(soup, url)
            for u in prev_links:
                if u not in visited and u not in queue:
                    queue.append(u)

            human_wait(1.2, 3.0)

        # dedupe and save
        df = pd.DataFrame(rows).drop_duplicates(subset=["url"])
        # prefer those with parsed dates
        if "date_slug" in df.columns and df["date_slug"].str.len().gt(0).any():
            df_valid = df[df["date_slug"].str.len()>0].copy()
            df_valid["date_slug"] = pd.to_datetime(df_valid["date_slug"])
            df_valid = df_valid.sort_values("date_slug", ascending=False).head(DAYS_BACK)
            out = df_valid
        else:
            out = df.head(DAYS_BACK)

        out.to_csv(f"zsu_daily_briefs_selenium_last_{DAYS_BACK}_days.csv", index=False, encoding="utf-8")
        print("Saved CSV:", f"zsu_daily_briefs_selenium_last_{DAYS_BACK}_days.csv")

    finally:
        driver.quit()

if __name__ == "__main__":
    main()
