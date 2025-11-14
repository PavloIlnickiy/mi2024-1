# -*- coding: utf-8 -*-
"""
X (Twitter) пошук через Selenium + мобільний сайт.
- Використовує ваш Chrome-профіль (куки) -> більше шансів бачити стрічку.
- Перший запуск РЕКОМЕНДОВАНО з USE_HEADLESS=False (видиме вікно).
- Працює по мобільному домену: https://mobile.twitter.com/... (менше блоків).
"""

import time, re, random, pandas as pd
from urllib.parse import quote_plus
from bs4 import BeautifulSoup
from datetime import datetime

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options

# -------- Налаштування --------
QUERY = 'Ukrainian army OR "Збройні Сили України"'
TAB = "live"                   # live = Latest
SCROLL_STEPS = 20
SCROLL_PAUSE = 1.3
MAX_POSTS = 300

# ВАЖЛИВО: перший запуск краще зробити з видимим вікном і залогіненим профілем
USE_HEADLESS = False           # True після того, як усе працює
USE_PROFILE = True             # використовувати ваш профіль Chrome
USER_DATA_DIR = r"C:\Users\Techer314\AppData\Local\Google\Chrome\User Data"
PROFILE_DIR = "Default"

OUT_CSV = f'x_search_selenium_{datetime.now().strftime("%Y%m%d_%H%M")}.csv'


def make_driver():
    opts = Options()
    if USE_HEADLESS:
        opts.add_argument("--headless=new")
    opts.add_argument("--window-size=430,900")   # мобільне вікно
    opts.add_argument("--disable-gpu")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--lang=uk-UA")
    ua = ("Mozilla/5.0 (Linux; Android 13; Pixel 7) "
          "AppleWebKit/537.36 (KHTML, like Gecko) "
          "Chrome/120.0.0.0 Mobile Safari/537.36")  # мобільний UA
    opts.add_argument(f"user-agent={ua}")
    # менше “слідів” автоматизації
    opts.add_experimental_option("excludeSwitches", ["enable-automation"])
    opts.add_experimental_option("useAutomationExtension", False)

    if USE_PROFILE:
        opts.add_argument(f"--user-data-dir={USER_DATA_DIR}")
        opts.add_argument(f"--profile-directory={PROFILE_DIR}")

    # швидший повернення керування
    opts.set_capability("pageLoadStrategy", "eager")

    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=opts)

    # малі патчі проти webdriver-флагу
    try:
        driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
            "source": """
Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
"""
        })
    except Exception:
        pass

    return driver


def clean(s: str) -> str:
    return re.sub(r"\s+\n","\n", re.sub(r"[ \t]+"," ", s or "")).strip()


def parse_posts_from_html(html: str):
    soup = BeautifulSoup(html, "lxml")

    # На mobile twitter картки часто в div[data-testid="cellInnerDiv"], але "статті" теж бувають
    cards = soup.select('article[role="article"]')
    if not cards:
        cards = soup.select('div[data-testid="cellInnerDiv"]')

    out = []
    for c in cards:
        # текст
        text_parts = [t.get_text(" ", strip=True) for t in c.select("div[lang]")]
        text = clean(" ".join(text_parts)) if text_parts else ""

        # url (шукаємо /status/)
        url = ""
        for a in c.select('a[href*="/status/"]'):
            href = a.get("href") or ""
            if "/status/" in href:
                url = "https://twitter.com" + href
                break

        # автор (на мобільній версії теж є лінки на профіль)
        author = ""
        prof = c.select_one('a[href^="/"][role="link"]')
        if prof:
            cand = (prof.get("href", "") or "").strip("/")
            if cand and all(x not in cand for x in ["home","explore","settings"]):
                author = cand

        # метрики на мобілці часто не доступні без відкриття твіта → робимо best-effort
        replies = retweets = likes = None

        # час
        dt_iso = ""
        t = c.select_one("time")
        if t and t.has_attr("datetime"):
            dt_iso = t["datetime"]

        if url or text:
            out.append({
                "datetime": dt_iso,
                "author": author,
                "text": text,
                "url": url,
                "replies": replies,
                "retweets": retweets,
                "likes": likes
            })
    return out


def human_pause(a=0.9, b=1.8):
    time.sleep(random.uniform(a, b))


def wait_timeline(driver):
    # очікуємо появу таймлайну пошуку
    # мобільний layout: main[role=main] і в ньому елементи з data-testid="cellInnerDiv"
    try:
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "main[role='main']"))
        )
    except Exception:
        pass


def main():
    q = quote_plus(QUERY)
    # мобільне посилання пошуку з вкладкою Latest
    search_url = f"https://mobile.twitter.com/search?q={q}&src=typed_query&f={TAB}"
    print("Open:", search_url)

    driver = make_driver()
    try:
        driver.get(search_url)
        wait_timeline(driver)

        seen, rows = set(), []
        for i in range(SCROLL_STEPS):
            # прокрутка вниз для підвантаження нових постів
            driver.execute_script("window.scrollBy(0, document.body.scrollHeight * 0.92);")
            human_pause(SCROLL_PAUSE, SCROLL_PAUSE + 0.8)

            html = driver.page_source
            posts = parse_posts_from_html(html)
            added = 0
            for p in posts:
                key = (p["url"], p["text"])
                if key not in seen:
                    seen.add(key)
                    rows.append(p)
                    added += 1

            print(f"[{i+1}/{SCROLL_STEPS}] додано {added}, всього {len(rows)}")
            if len(rows) >= MAX_POSTS:
                break

        df = pd.DataFrame(rows).drop_duplicates(subset=["url","text"])
        df.to_csv(OUT_CSV, index=False, encoding="utf-8")
        print("✅ Збережено:", OUT_CSV)

    finally:
        driver.quit()


if __name__ == "__main__":
    main()
