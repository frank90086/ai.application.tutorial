#!/usr/bin/env python3
"""把 assets/ 的共用 CSS 與 JS 內嵌進各課的 HTML。

為什麼需要這一步：課程 HTML 會被用各種方式打開（直接雙擊、丟進預覽視窗、
寄給別人）。外部 CSS/JS 在某些情境下載不到（例如以 data: URL 渲染時），
頁面就會變成沒有樣式也沒有互動。所以實際交付的檔案要自給自足。

assets/ 底下的檔案是「原始碼」，只改那裡；改完跑一次這支程式。

    python3 lessons/build.py
"""
import re
import sys
from pathlib import Path

HERE = Path(__file__).parent
ASSETS = HERE / "assets"
PAGES = sorted(HERE.glob("*.html"))

CSS_START, CSS_END = "<!--SHARED-CSS:START-->", "<!--SHARED-CSS:END-->"
JS_START, JS_END = "<!--SHARED-JS:START-->", "<!--SHARED-JS:END-->"


def inject(html: str, start: str, end: str, tag: str, payload: str) -> tuple[str, bool]:
    """把 start/end 標記之間的內容換成 payload。找不到標記就回報。"""
    pattern = re.compile(re.escape(start) + r".*?" + re.escape(end), re.S)
    if not pattern.search(html):
        return html, False
    block = f"{start}\n<{tag}>\n{payload}\n</{tag}>\n{end}"
    return pattern.sub(lambda _m: block, html), True


def main() -> int:
    css = (ASSETS / "lesson.css").read_text()
    js = (ASSETS / "lesson.js").read_text()

    if "</script>" in js:
        print("!! lesson.js 裡有 </script>，內嵌後會提早結束 script 標籤", file=sys.stderr)
        return 1

    failed = False
    for page in PAGES:
        html = page.read_text()
        html, ok_css = inject(html, CSS_START, CSS_END, "style", css)
        html, ok_js = inject(html, JS_START, JS_END, "script", js)
        if not (ok_css and ok_js):
            missing = [n for n, ok in (("CSS", ok_css), ("JS", ok_js)) if not ok]
            print(f"!! {page.name}: 找不到 {'/'.join(missing)} 標記", file=sys.stderr)
            failed = True
            continue
        page.write_text(html)
        print(f"   {page.name}  ({len(html) // 1024} KB)")

    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
