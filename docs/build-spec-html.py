#!/usr/bin/env python3
"""
build-spec-html.py — Convert uat-functional-spec.md -> self-contained HTML

Output: docs/uat-functional-spec.html
- Single file, no build step on the consumer side
- Mermaid code-blocks kept verbatim (hydrated by Mermaid CDN at view time)
- Tables / headings / lists rendered to HTML
- GitHub-flavored + elegant typography
- Self-contained stylesheet (offline-renderable)

Usage:
    python3 docs/build-spec-html.py
"""
from __future__ import annotations
import html
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent  # /.../email_agent
MD = ROOT / "docs" / "uat-functional-spec.md"
OUT = ROOT / "docs" / "uat-functional-spec.html"


def slugify(text: str) -> str:
    s = re.sub(r"[\s\u3000\u4e00-\u9fff]+", "-", text.strip())
    s = re.sub(r"[^\w\-]", "", s, flags=re.UNICODE)
    return s.lower().strip("-") or "section"


def render_inline(text: str) -> str:
    """Render inline markdown: **bold**, *em*, `code`, [links](url)."""
    out = text
    # escape html first, then restore tags
    placeholder_marker = "\u0001BACKTICK\u0001"
    out = out.replace("`", placeholder_marker)
    out = html.escape(out, quote=False)
    # restore backticked text (will be handled as inline code)
    out = out.replace(placeholder_marker, "`")

    # restore code spans: capture content between backticks (allow escaped)
    out = re.sub(
        r"`([^`]+)`",
        r'<code class="md-inline-code">\1</code>',
        out,
    )

    # bold **x**
    out = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", out)
    # em *x* (single)
    out = re.sub(r"(?<![\*\\])\*([^\*\n]+)\*(?!\*)", r"<em>\1</em>", out)
    # links [t](u)
    out = re.sub(
        r"\[([^\]]+)\]\(([^)]+)\)",
        r'<a href="\2" target="_blank" rel="noopener">\1</a>',
        out,
    )
    return out


def render_table(lines: list[str]) -> str:
    """Render a markdown table from a list of raw pipe-delimited lines."""
    rows = []
    for ln in lines:
        cells = [c.strip() for c in ln.strip().strip("|").split("|")]
        rows.append(cells)
    if len(rows) < 2:
        return "<p>" + "<br>".join(lines) + "</p>"
    headers = rows[0]
    aligns = []
    sep = rows[1]
    for cell in sep:
        s = re.sub(r"[^\:\-]", "", cell)
        if s.startswith(":") and s.endswith(":"):
            aligns.append("center")
        elif s.endswith(":"):
            aligns.append("right")
        else:
            aligns.append("left")
    body = rows[2:]
    out = ['<table class="md-table">']
    out.append("<thead><tr>")
    for h, a in zip(headers, aligns):
        out.append(f'<th style="text-align:{a}">{render_inline(h)}</th>')
    out.append("</tr></thead><tbody>")
    for r in body:
        # pad row if cells shorter than headers
        while len(r) < len(headers):
            r.append("")
        out.append("<tr>")
        for c, a in zip(r, aligns):
            out.append(f'<td style="text-align:{a}">{render_inline(c)}</td>')
        out.append("</tr>")
    out.append("</tbody></table>")
    return "\n".join(out)


def convert(md: str) -> str:
    """Top-level markdown -> html fragment."""
    lines = md.split("\n")
    out: list[str] = []
    i = 0
    in_code = False
    code_lang = ""
    code_buf: list[str] = []
    in_list = False
    list_buf: list[str] = []

    def close_list():
        nonlocal in_list, list_buf
        if in_list:
            out.append("<ul>" + "".join(list_buf) + "</ul>")
            in_list = False
            list_buf = []

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        # fenced code blocks
        fence = re.match(r"^```(\w*)\s*$", stripped)
        if fence:
            if in_code:
                # close current
                cls = f"language-{code_lang}" if code_lang else ""
                escaped = html.escape("\n".join(code_buf))
                if code_lang == "mermaid":
                    out.append(
                        f'<pre class="mermaid">{escaped}</pre>'
                    )
                else:
                    out.append(
                        f'<pre><code class="{cls} hljs">{escaped}</code></pre>'
                    )
                in_code = False
                code_buf = []
                code_lang = ""
            else:
                # check if previous list still open
                close_list()
                in_code = True
                code_lang = fence.group(1) or ""
                code_buf = []
            i += 1
            continue
        if in_code:
            code_buf.append(line)
            i += 1
            continue

        # tables — collect contiguous pipe lines
        if stripped.startswith("|") and "|" in stripped[1:]:
            close_list()
            tbl = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                tbl.append(lines[i])
                i += 1
            out.append(render_table(tbl))
            continue

        # headings
        h_match = re.match(r"^(#{1,6})\s+(.*)", stripped)
        if h_match:
            close_list()
            level = len(h_match.group(1))
            content = render_inline(h_match.group(2))
            anchor = slugify(h_match.group(2))
            out.append(
                f'<h{level} id="{anchor}" class="md-h md-h{level}">'
                f"{content}</h{level}>"
            )
            i += 1
            continue

        # list items
        li = re.match(r"^(\s*)-\s+(.*)", line)
        if li:
            content = render_inline(li.group(2))
            list_buf.append(f"<li>{content}</li>")
            in_list = True
            i += 1
            continue
        # numbered list
        oi = re.match(r"^(\s*)\d+\.\s+(.*)", line)
        if oi:
            content = render_inline(oi.group(2))
            list_buf.append(f"<li>{content}</li>")
            in_list = True
            i += 1
            continue

        # horizontal rule
        if stripped == "---":
            close_list()
            out.append("<hr>")
            i += 1
            continue

        # blank line → close list, paragraph break
        if stripped == "":
            close_list()
            i += 1
            continue

        # blockquote (> ... )
        if stripped.startswith(">"):
            close_list()
            # gather consecutive > lines
            qbuf = []
            while i < len(lines) and lines[i].strip().startswith(">"):
                qbuf.append(lines[i].strip()[1:].strip())
                i += 1
            content = render_inline(" ".join(qbuf))
            out.append(f"<blockquote>{content}</blockquote>")
            continue

        # paragraph — gather until blank
        close_list()
        para = [line]
        j = i + 1
        while j < len(lines) and lines[j].strip() != "":
            nxt = lines[j].strip()
            if (
                re.match(r"^#{1,6}\s+", nxt)
                or nxt.startswith("|")
                or nxt.startswith("```")
                or re.match(r"^\s*-\s+", lines[j])
                or re.match(r"^\s*\d+\.\s+", lines[j])
                or nxt == "---"
            ):
                break
            para.append(lines[j])
            j += 1
        text = " ".join(p.strip() for p in para)
        out.append(f"<p>{render_inline(text)}</p>")
        i = j

    close_list()
    return "\n".join(out)


HTML_TEMPLATE = """<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ClientRadar AI — UAT 功能清單與系統流程圖</title>
<style>
:root {
  --bg: #0f1116;
  --panel: #161a23;
  --panel-2: #1d2230;
  --border: #2a3142;
  --text: #e6e8ee;
  --muted: #98a2b3;
  --accent: #6bd4f0;
  --accent-2: #a78bfa;
  --good: #57e08a;
  --warn: #f7b955;
  --radius: 8px;
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang TC", "Microsoft JhengHei", sans-serif; line-height: 1.65; }
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
main { max-width: 980px; margin: 0 auto; padding: 28px 32px 96px; }
header.banner {
  background: linear-gradient(135deg, #1d2230 0%, #161a23 100%);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 24px 28px;
  margin-bottom: 28px;
}
header.banner .meta { color: var(--muted); font-size: 0.85rem; margin-bottom: 8px; }
header.banner h1 { margin: 0 0 8px; font-size: 1.6rem; color: var(--accent); }
header.banner p { margin: 4px 0; color: var(--muted); font-size: 0.95rem; }
nav.toc { background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px 22px; margin-bottom: 32px; }
nav.toc h2 { margin: 0 0 10px; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 1px; color: var(--accent-2); }
nav.toc ol { margin: 0; padding-left: 20px; columns: 2; column-gap: 24px; }
nav.toc li { break-inside: avoid; font-size: 0.9rem; padding: 2px 0; }
nav.toc a { color: var(--text); }
nav.toc a:hover { color: var(--accent); }
.md-h { margin: 36px 0 14px; line-height: 1.3; border-bottom: 1px solid var(--border); padding-bottom: 6px; }
.md-h1 { font-size: 1.6rem; color: var(--accent); border-bottom: none; padding-bottom: 0; }
.md-h2 { font-size: 1.35rem; color: var(--accent); border-bottom-color: var(--accent); }
.md-h3 { font-size: 1.15rem; color: var(--accent-2); }
.md-h4 { font-size: 1.05rem; color: var(--accent-2); }
.md-h5, .md-h6 { font-size: 1rem; color: var(--muted); }
p { margin: 0.6em 0; }
ul, ol { padding-left: 28px; margin: 0.5em 0 1.2em; }
li { margin: 0.2em 0; }
code.md-inline-code {
  background: var(--panel-2);
  color: #ffd58a;
  padding: 1px 6px;
  border-radius: 3px;
  font-family: "SF Mono", Menlo, Consolas, monospace;
  font-size: 0.86em;
}
pre {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px 18px;
  margin: 12px 0;
  overflow-x: auto;
  font-family: "SF Mono", Menlo, Consolas, monospace;
  font-size: 0.84rem;
  line-height: 1.55;
}
pre.mermaid {
  background: #0e131c;
  border: 1px dashed var(--accent);
  font-family: "SF Mono", monospace;
  text-align: center;
}
pre code { color: #e6e8ee; }
.md-table {
  border-collapse: collapse;
  width: 100%;
  margin: 12px 0 20px;
  font-size: 0.92rem;
}
.md-table th, .md-table td {
  border: 1px solid var(--border);
  padding: 8px 12px;
  vertical-align: top;
}
.md-table th {
  background: var(--panel-2);
  color: var(--accent);
  font-weight: 600;
}
.md-table tr:nth-child(even) td { background: rgba(255,255,255,0.02); }
hr { border: none; border-top: 1px dashed var(--border); margin: 28px 0; }
strong { color: var(--good); }
em { color: var(--accent-2); }
blockquote {
  border-left: 3px solid var(--accent);
  background: rgba(107,212,240,0.05);
  margin: 16px 0;
  padding: 10px 18px;
  border-radius: 0 var(--radius) var(--radius) 0;
  color: var(--muted);
  font-size: 0.92rem;
}
blockquote code.md-inline-code { color: var(--accent); }
footer {
  margin-top: 56px;
  padding: 24px;
  text-align: center;
  color: var(--muted);
  font-size: 0.85rem;
  border-top: 1px solid var(--border);
}
@media (max-width: 720px) {
  nav.toc ol { columns: 1; }
  main { padding: 16px; }
}
@media print {
  :root { --bg: white; --panel: white; --text: black; }
  nav.toc { display: none; }
  pre.mermaid { break-inside: avoid; }
}
</style>
</head>
<body>
<main>
<header class="banner">
  <div class="meta">ClientRadar AI · UAT 文件 · v1.0 · 2026-07-28</div>
  <h1>ClientRadar AI — UAT 功能清單與系統流程圖</h1>
  <p>本文件以網頁版呈現,所有 Mermaid 圖表由 <a href="https://mermaid.js.org/">Mermaid.js</a> 即時渲染。</p>
  <p>每章節都有錨點連結,可直接於 URL hash 後分享到同事。</p>
</header>
<nav class="toc">
  <h2>目錄</h2>
  <ol id="toc-list"><li>(由 JavaScript 即時生成)</li></ol>
</nav>
$body
<footer>
  Built with Mermaid.js · $lines lines · self-contained HTML
  · <a href="./uat-functional-spec.md">原始 Markdown</a>
</footer>
</main>
<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
<script>
  mermaid.initialize({
    startOnLoad: true,
    theme: 'dark',
    themeVariables: {
      primaryColor: '#1d2230',
      primaryTextColor: '#e6e8ee',
      primaryBorderColor: '#2a3142',
      lineColor: '#6bd4f0',
      secondaryColor: '#161a23',
      tertiaryColor: '#161a23'
    },
    flowchart: { curve: 'basis', htmlLabels: true },
    sequence: { diagramMarginX: 50, diagramMarginY: 30 },
    securityLevel: 'loose'
  });
  (function buildTOC() {
    const tocOl = document.getElementById('toc-list');
    if (!tocOl) return;
    tocOl.innerHTML = '';
    const seenLabels = new Set();
    document.querySelectorAll('main > h2').forEach((h, i) => {
      // Skip the document's own TOC heading (中文: "目錄") to avoid self-reference
      const numPrefix = h.textContent.match(/^(\d+\.?\s*)/);
      let label = h.textContent;
      if (numPrefix) label = label.substring(numPrefix[1].length);
      if (label === '目錄') return;
      if (seenLabels.has(label)) return;
      seenLabels.add(label);
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '#' + h.id;
      // strip leading numeric prefix like "1. 系統定位" -> "系統定位"
      const numPrefix = h.textContent.match(/^(\d+\.?\s*)/);
      let label = h.textContent;
      if (numPrefix) label = label.substring(numPrefix[1].length);
      a.textContent = (i + 1) + '. ' + label;
      li.appendChild(a);
      const subList = [];
      let next = h.nextElementSibling;
      while (next && next.tagName !== 'H2') {
        if (next.tagName === 'H3') {
          const sub = document.createElement('li');
          sub.style.marginLeft = '16px';
          const sa = document.createElement('a');
          sa.href = '#' + next.id;
          sa.textContent = next.textContent;
          sub.appendChild(sa);
          subList.push(sub);
        }
        next = next.nextElementSibling;
      }
      if (subList.length) {
        const ol = document.createElement('ol');
        ol.style.paddingLeft = '8px';
        subList.forEach(s => ol.appendChild(s));
        li.appendChild(ol);
      }
      tocOl.appendChild(li);
    });
  })();
</script>
</body>
</html>
"""


def main():
    if not MD.exists():
        print(f"missing {MD}", file=sys.stderr)
        sys.exit(1)
    md = MD.read_text(encoding="utf-8")
    body = convert(md)
    from string import Template
    t = Template(HTML_TEMPLATE)
    html_out = t.substitute(body=body, lines=len(md.splitlines()))
    OUT.write_text(html_out, encoding="utf-8")
    mermaid_count = html_out.count('class="mermaid"')
    print(f"wrote {OUT}")
    print(f"  bytes={len(html_out)}")
    print(f"  mermaid blocks: {mermaid_count}")


if __name__ == "__main__":
    main()
