#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')
const docsDir = join(rootDir, 'docs')

const manualFiles = [
  'README.md',
  '01_overview.md',
  '02_getting_started.md',
  '03_customers.md',
  '04_contracts.md',
  '05_opportunities.md',
  '06_intentions.md',
  '07_settlement.md',
  '08_calendar.md',
  '09_reports.md',
  '10_dashboard.md',
  '11_settings.md',
  '12_lark_integration.md',
  '13_admin_operations.md',
  '14_security_compliance.md',
]

const outputs = [
  {
    title: 'HOKENA CRM 説明書',
    subtitle: '管理者・選定担当者向け 画面付き手順書',
    sourceFiles: manualFiles,
    html: 'hokena-crm-manual.html',
    pdf: 'hokena-crm-manual.pdf',
  },
  {
    title: 'HOKENA CRM 現状報告・打ち合わせ確認事項',
    subtitle: '先方打ち合わせ用サマリー',
    sourceFiles: ['customer-meeting-brief.md'],
    html: 'customer-meeting-brief.html',
    pdf: 'customer-meeting-brief.pdf',
  },
]

const generatedAt = new Intl.DateTimeFormat('ja-JP', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'Asia/Tokyo',
}).format(new Date())

for (const output of outputs) {
  const chapters = output.sourceFiles.map((file) => loadChapter(file))
  const html = buildHtml(output, chapters)
  const htmlPath = join(docsDir, output.html)
  const pdfPath = join(docsDir, output.pdf)

  writeFileSync(htmlPath, html)
  printPdf(htmlPath, pdfPath)
  console.log(`created docs/${output.html}`)
  console.log(`created docs/${output.pdf}`)
}

function loadChapter(file) {
  const absolutePath = join(docsDir, file)
  const markdown = readFileSync(absolutePath, 'utf8')
  const id = file.replace(/\.md$/, '')
  const title = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? file

  return {
    id,
    file,
    title,
    html: renderMarkdown(markdown, id),
  }
}

function buildHtml(output, chapters) {
  const toc = chapters
    .map(
      (chapter, index) =>
        `<a href="#${escapeAttr(chapter.id)}"><span>${String(index + 1).padStart(2, '0')}</span>${escapeHtml(chapter.title)}</a>`,
    )
    .join('\n')

  const body = chapters
    .map(
      (chapter) => `
        <section class="chapter" id="${escapeAttr(chapter.id)}">
          ${chapter.html}
        </section>
      `,
    )
    .join('\n')

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(output.title)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600&display=swap');

    :root {
      --color-bg: #FFFFFF;
      --color-bg-secondary: #F5F5F5;
      --color-text: #111111;
      --color-text-sub: #374151;
      --color-text-muted: #6B7280;
      --color-border: #E5E5E5;
      --color-border-strong: #D1D5DB;
      --color-accent: #1A56DB;
      --color-accent-tint: rgba(26, 86, 219, 0.08);
      --color-warning: #CA8A04;
      --radius-sm: 4px;
      --radius-md: 6px;
      --radius-lg: 8px;
      --font-base: 'Noto Sans JP', sans-serif;
      --font-xs: 11px;
      --font-sm: 12px;
      --font-md: 14px;
      --font-lg: 16px;
      --font-xl: 20px;
      --font-2xl: 24px;
      --line: 1.78;
      --page-width: 1080px;
    }

    @page {
      size: A4;
      margin: 14mm 12mm;
    }

    * {
      box-sizing: border-box;
    }

    html {
      background: var(--color-bg-secondary);
      color: var(--color-text);
      font-family: var(--font-base);
      font-size: var(--font-md);
      line-height: var(--line);
    }

    body {
      margin: 0;
      background: var(--color-bg);
    }

    a {
      color: var(--color-accent);
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }

    .cover {
      border-bottom: 1px solid var(--color-border);
      padding: 48px 40px 32px;
    }

    .cover-inner,
    .content {
      margin: 0 auto;
      max-width: var(--page-width);
    }

    .doc-label {
      color: var(--color-text-muted);
      font-size: var(--font-sm);
      font-weight: 500;
      letter-spacing: 0;
      margin: 0 0 14px;
    }

    .cover h1 {
      font-size: 30px;
      line-height: 1.35;
      margin: 0 0 8px;
      font-weight: 600;
    }

    .cover p {
      color: var(--color-text-sub);
      margin: 0;
    }

    .meta {
      color: var(--color-text-muted);
      font-size: var(--font-sm);
      margin-top: 18px;
    }

    .toc {
      background: var(--color-bg-secondary);
      border-bottom: 1px solid var(--color-border);
      padding: 24px 40px;
    }

    .toc h2 {
      font-size: var(--font-lg);
      margin: 0 0 12px;
    }

    .toc-grid {
      display: grid;
      gap: 6px 18px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      margin: 0 auto;
      max-width: var(--page-width);
    }

    .toc-grid a {
      align-items: baseline;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      color: var(--color-text);
      display: flex;
      gap: 10px;
      min-height: 36px;
      padding: 6px 10px;
      text-decoration: none;
    }

    .toc-grid span {
      color: var(--color-text-muted);
      font-size: var(--font-xs);
      min-width: 22px;
    }

    .content {
      padding: 24px 40px 56px;
    }

    .chapter {
      break-before: page;
      padding-top: 8px;
    }

    .chapter:first-child {
      break-before: auto;
    }

    h1,
    h2,
    h3,
    h4 {
      color: var(--color-text);
      font-weight: 600;
      letter-spacing: 0;
      line-height: 1.45;
    }

    h1 {
      border-bottom: 1px solid var(--color-border-strong);
      font-size: var(--font-2xl);
      margin: 20px 0 18px;
      padding-bottom: 10px;
    }

    h2 {
      font-size: var(--font-xl);
      margin: 28px 0 12px;
    }

    h3 {
      font-size: var(--font-lg);
      margin: 22px 0 8px;
    }

    h4 {
      font-size: var(--font-md);
      margin: 18px 0 6px;
    }

    p,
    ul,
    ol,
    blockquote,
    table,
    pre,
    figure {
      margin: 0 0 14px;
    }

    ul,
    ol {
      padding-left: 1.45em;
    }

    li + li {
      margin-top: 4px;
    }

    blockquote {
      background: var(--color-accent-tint);
      border-left: 4px solid var(--color-accent);
      border-radius: var(--radius-sm);
      color: var(--color-text-sub);
      padding: 10px 12px;
    }

    table {
      border-collapse: collapse;
      font-size: var(--font-sm);
      width: 100%;
    }

    th,
    td {
      border: 1px solid var(--color-border);
      padding: 7px 8px;
      vertical-align: top;
    }

    th {
      background: var(--color-bg-secondary);
      font-weight: 600;
      text-align: left;
    }

    code {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      font-family: var(--font-base);
      font-size: 0.92em;
      padding: 0.08em 0.32em;
    }

    pre {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      overflow-x: auto;
      padding: 12px;
      white-space: pre-wrap;
    }

    pre code {
      background: transparent;
      border: 0;
      padding: 0;
    }

    figure {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      break-inside: avoid;
      padding: 10px;
    }

    img {
      display: block;
      height: auto;
      max-width: 100%;
    }

    figcaption {
      color: var(--color-text-muted);
      font-size: var(--font-xs);
      margin-top: 6px;
      text-align: center;
    }

    hr {
      border: 0;
      border-top: 1px solid var(--color-border);
      margin: 24px 0;
    }

    .status-table td:first-child,
    .status-table th:first-child {
      white-space: nowrap;
    }

    @media screen and (max-width: 760px) {
      .cover,
      .toc,
      .content {
        padding-left: 18px;
        padding-right: 18px;
      }

      .toc-grid {
        grid-template-columns: 1fr;
      }
    }

    @media print {
      html,
      body {
        background: var(--color-bg);
      }

      .cover {
        padding-top: 0;
      }

      .toc-grid {
        grid-template-columns: 1fr;
      }

      a {
        color: var(--color-text);
      }
    }
  </style>
</head>
<body>
  <header class="cover">
    <div class="cover-inner">
      <p class="doc-label">HOKENA CRM / GRUST G-DX</p>
      <h1>${escapeHtml(output.title)}</h1>
      <p>${escapeHtml(output.subtitle)}</p>
      <p class="meta">生成日時: ${escapeHtml(generatedAt)}</p>
    </div>
  </header>
  <nav class="toc" aria-label="目次">
    <div class="cover-inner">
      <h2>目次</h2>
      <div class="toc-grid">
        ${toc}
      </div>
    </div>
  </nav>
  <main class="content">
    ${body}
  </main>
</body>
</html>
`
}

function renderMarkdown(markdown, chapterId) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const out = []
  let i = 0
  let inCode = false
  let codeLang = ''
  let codeLines = []

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('```')) {
      if (inCode) {
        out.push(
          `<pre><code class="language-${escapeAttr(codeLang)}">${escapeHtml(codeLines.join('\n'))}</code></pre>`,
        )
        inCode = false
        codeLang = ''
        codeLines = []
      } else {
        inCode = true
        codeLang = line.slice(3).trim()
      }
      i++
      continue
    }

    if (inCode) {
      codeLines.push(line)
      i++
      continue
    }

    if (!line.trim()) {
      i++
      continue
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/)
    if (heading) {
      const level = heading[1].length
      const text = heading[2].trim()
      const id = level === 1 ? chapterId : `${chapterId}-${slugify(text)}`
      out.push(`<h${level} id="${escapeAttr(id)}">${renderInline(text)}</h${level}>`)
      i++
      continue
    }

    if (/^\s*---+\s*$/.test(line)) {
      out.push('<hr>')
      i++
      continue
    }

    const image = line.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/)
    if (image) {
      const alt = image[1]
      const src = normalizeHref(image[2])
      out.push(
        `<figure><img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}"><figcaption>${escapeHtml(alt)}</figcaption></figure>`,
      )
      i++
      continue
    }

    if (isTableStart(lines, i)) {
      const tableLines = []
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        tableLines.push(lines[i])
        i++
      }
      out.push(renderTable(tableLines))
      continue
    }

    if (/^\s*>\s?/.test(line)) {
      const quote = []
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^\s*>\s?/, ''))
        i++
      }
      out.push(`<blockquote>${renderParagraphs(quote)}</blockquote>`)
      continue
    }

    if (/^\s*-\s+/.test(line)) {
      const items = []
      while (i < lines.length && /^\s*-\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*-\s+/, ''))
        i++
      }
      out.push(`<ul>${items.map((item) => `<li>${renderInline(item)}</li>`).join('')}</ul>`)
      continue
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items = []
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''))
        i++
      }
      out.push(`<ol>${items.map((item) => `<li>${renderInline(item)}</li>`).join('')}</ol>`)
      continue
    }

    const paragraph = [line.trim()]
    i++
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith('```') &&
      !/^(#{1,4})\s+/.test(lines[i]) &&
      !/^\s*---+\s*$/.test(lines[i]) &&
      !/^\s*>\s?/.test(lines[i]) &&
      !/^\s*-\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !isTableStart(lines, i)
    ) {
      paragraph.push(lines[i].trim())
      i++
    }
    out.push(`<p>${renderInline(paragraph.join(' '))}</p>`)
  }

  return out.join('\n')
}

function renderParagraphs(lines) {
  const paragraphs = []
  let current = []
  for (const line of lines) {
    if (!line.trim()) {
      if (current.length) {
        paragraphs.push(`<p>${renderInline(current.join(' '))}</p>`)
        current = []
      }
    } else {
      current.push(line.trim())
    }
  }
  if (current.length) paragraphs.push(`<p>${renderInline(current.join(' '))}</p>`)
  return paragraphs.join('')
}

function isTableStart(lines, index) {
  return (
    /^\s*\|.*\|\s*$/.test(lines[index] ?? '') &&
    /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[index + 1] ?? '')
  )
}

function renderTable(lines) {
  const rows = lines.map((line) =>
    line
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((cell) => cell.trim()),
  )
  const [header, , ...body] = rows
  return `<table>
    <thead><tr>${header.map((cell) => `<th>${renderInline(cell)}</th>`).join('')}</tr></thead>
    <tbody>${body
      .map((row) => `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join('')}</tr>`)
      .join('')}</tbody>
  </table>`
}

function renderInline(raw) {
  const code = []
  let text = raw.replace(/`([^`]+)`/g, (_, value) => {
    const token = `@@CODE_${code.length}@@`
    code.push(`<code>${escapeHtml(value)}</code>`)
    return token
  })

  text = escapeHtml(text)
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, href) => {
    return `<img src="${escapeAttr(normalizeHref(href))}" alt="${escapeAttr(alt)}">`
  })
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
    const normalized = normalizeHref(href)
    return `<a href="${escapeAttr(normalized)}">${label}</a>`
  })
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  text = text.replace(/@@CODE_(\d+)@@/g, (_, index) => code[Number(index)] ?? '')
  return text
}

function normalizeHref(href) {
  const cleaned = href.trim()
  const md = cleaned.match(/^\.\/([^/#)]+)\.md(?:#.*)?$/)
  if (md) return `#${md[1]}`
  if (cleaned.startsWith('./assets/')) return cleaned.replace('./assets/', 'assets/')
  return cleaned
}

function slugify(value) {
  const normalized = value
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  return normalized || 'section'
}

function printPdf(htmlPath, pdfPath) {
  const chrome = findChrome()
  if (!chrome) {
    throw new Error('Google Chrome が見つからないため PDF を生成できませんでした。')
  }

  mkdirSync(dirname(pdfPath), { recursive: true })
  execFileSync(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--print-to-pdf-no-header',
    `--print-to-pdf=${pdfPath}`,
    '--run-all-compositor-stages-before-draw',
    '--virtual-time-budget=10000',
    pathToFileURL(htmlPath).href,
  ])
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    'google-chrome',
    'chromium',
    'chromium-browser',
  ].filter(Boolean)

  for (const candidate of candidates) {
    if (candidate.includes('/') && existsSync(candidate)) return candidate
    if (!candidate.includes('/')) return candidate
  }
  return null
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll('\n', ' ')
}
