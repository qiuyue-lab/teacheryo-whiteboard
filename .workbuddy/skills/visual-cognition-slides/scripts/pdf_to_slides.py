#!/usr/bin/env python3
"""
pdf_to_slides.py — PDF 转 HTML Slides
Visual Cognition Skill · 爱思考的伊伊子

两种模式：
  1. 图片模式（默认）：每页 PDF 渲染为图片，嵌入 HTML
  2. 文字模式（--text）：提取文字内容，生成可编辑 slides

用法：
  python3 pdf_to_slides.py input.pdf [output.html]
  python3 pdf_to_slides.py input.pdf --text   # 文字提取模式

依赖：
  pip install pymupdf Pillow
  # 或者: pip install pdfplumber Pillow  (--text 模式备选)
"""

import sys
import base64
import io
from pathlib import Path

try:
    import fitz  # PyMuPDF
    HAS_FITZ = True
except ImportError:
    HAS_FITZ = False

try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False


def page_to_base64(page, dpi=150):
    """将 PDF 页面渲染为 base64 图片"""
    mat = fitz.Matrix(dpi/72, dpi/72)
    pix = page.get_pixmap(matrix=mat, alpha=False)
    img_bytes = pix.tobytes('jpeg', jpg_quality=85)
    return base64.b64encode(img_bytes).decode('utf-8'), pix.width, pix.height


def extract_text_from_page(page):
    """提取页面文字（按大小分层）"""
    blocks = page.get_text('dict', flags=11)['blocks']
    texts = []
    for block in blocks:
        if block.get('type') != 0:  # 0=text
            continue
        for line in block.get('lines', []):
            for span in line.get('spans', []):
                text = span.get('text', '').strip()
                if not text:
                    continue
                texts.append({
                    'text':      text,
                    'size':      span.get('size', 12),
                    'bold':      bool(span.get('flags', 0) & 2**4),
                    'color':     '#{:06x}'.format(span.get('color', 0)),
                    'bbox':      span.get('bbox'),
                })
    return texts


def image_mode_html(pdf_path, output_title):
    """图片模式：每页渲染为图片"""
    if not HAS_FITZ:
        print("请安装 PyMuPDF：pip install pymupdf")
        sys.exit(1)

    doc = fitz.open(str(pdf_path))
    slides_html = []

    for i, page in enumerate(doc):
        print(f"  渲染第 {i+1}/{len(doc)} 页…")
        b64, w, h = page_to_base64(page, dpi=150)
        aspect = h / w
        slides_html.append(f'''
    <section class="slide{'  active' if i==0 else ''}" id="s{i+1}">
      <div class="pdf-page-wrap">
        <img src="data:image/jpeg;base64,{b64}" class="pdf-page-img" alt="第 {i+1} 页" style="aspect-ratio:{w}/{h}">
      </div>
      <div class="sn">{i+1:02d} / {len(doc):02d}</div>
    </section>''')

    return len(doc), '\n'.join(slides_html)


def text_mode_html(pdf_path, output_title):
    """文字模式：提取文字，生成可编辑 slides"""
    if not HAS_FITZ:
        print("请安装 PyMuPDF：pip install pymupdf")
        sys.exit(1)

    doc = fitz.open(str(pdf_path))
    slides_html = []

    for i, page in enumerate(doc):
        print(f"  提取第 {i+1}/{len(doc)} 页文字…")
        texts = extract_text_from_page(page)

        if not texts:
            slides_html.append(f'''
    <section class="slide{'  active' if i==0 else ''}" id="s{i+1}">
      <div class="tx-content"><p class="tx-body" style="opacity:.3">[空白页]</p></div>
      <div class="sn">{i+1:02d}</div>
    </section>''')
            continue

        # 最大字号判断为标题
        max_size = max(t['size'] for t in texts)
        title_threshold = max_size * 0.8

        title_parts = []
        body_parts  = []
        for t in texts:
            if t['size'] >= title_threshold:
                title_parts.append(t['text'])
            else:
                body_parts.append(t)

        title_html = f'<div class="tx-title editable">{" ".join(title_parts)}</div>' if title_parts else ''

        body_html = ''
        for t in body_parts:
            scale = max(0.7, min(t['size'] / 18, 1.5))
            style = f'font-size:calc(var(--size-body) * {scale:.1f});'
            if t['bold']: style += 'font-weight:900;'
            body_html += f'<p class="tx-body editable" style="{style}">{t["text"]}</p>\n'

        slides_html.append(f'''
    <section class="slide{'  active' if i==0 else ''}" id="s{i+1}">
      <div class="tx-content">
        {title_html}
        {body_html}
      </div>
      <div class="sn">{i+1:02d} / {len(doc):02d}</div>
    </section>''')

    return len(doc), '\n'.join(slides_html)


def build_html(slide_count, slides_html_str, title, mode):
    extra_css = ''
    if mode == 'image':
        extra_css = '''
.pdf-page-wrap { display:flex; align-items:center; justify-content:center; width:100%; height:100%; padding:20px; }
.pdf-page-img  { max-width:100%; max-height:100%; object-fit:contain; box-shadow:0 8px 32px rgba(0,0,0,.3); }
'''
    else:
        extra_css = '''
.tx-content { width:86%; max-height:92%; display:flex; flex-direction:column; gap:20px; overflow:hidden; position:relative; z-index:1; }
.tx-title { font-family:"Noto Sans SC",sans-serif; font-weight:900; font-size:var(--size-display); line-height:1.15; }
.tx-body  { font-family:"Noto Sans SC",sans-serif; font-size:var(--size-body); line-height:1.65; }
'''

    return f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;900&family=Space+Mono&display=swap" rel="stylesheet">
<style>
:root{{
  --bg:#f5f0e8; --ink:#1a1410;
  --size-display:clamp(36px,4vw,88px);
  --size-body:clamp(14px,1.35vw,26px);
}}
*{{box-sizing:border-box;margin:0;padding:0;}}
html,body{{width:100%;height:100%;overflow:hidden;background:#111;}}
.deck-wrap{{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;}}
.deck{{width:1920px;height:1080px;position:relative;transform-origin:top left;}}
.slide{{
  position:absolute;inset:0;background:var(--bg);
  display:none;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;
}}
.slide::before{{
  content:'';position:absolute;inset:0;
  background-image:radial-gradient(circle,rgba(26,20,16,.1) 1.5px,transparent 1.5px);
  background-size:40px 40px;pointer-events:none;
}}
.slide.active{{display:flex;}}
.sn{{position:absolute;bottom:24px;right:40px;font-family:"Space Mono",monospace;font-size:14px;opacity:.25;}}
#prog{{position:absolute;bottom:0;left:0;height:4px;background:var(--ink);transition:width .3s;z-index:200;}}
{extra_css}
[contenteditable=true]{{outline:2px dashed #e8a020!important;}}
#editBar{{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);
  background:#1a1410;color:#f5f0e8;padding:10px 20px;border-radius:999px;
  z-index:999;display:none;gap:12px;align-items:center;}}
#editBar button{{background:none;border:1px solid rgba(255,255,255,.3);color:inherit;padding:6px 16px;border-radius:999px;cursor:pointer;font-size:14px;}}
</style>
</head>
<body>
<div class="deck-wrap">
<div class="deck" id="deck" data-w="1920" data-h="1080">
{slides_html_str}
<div id="prog"></div>
</div>
</div>
<div id="editBar">
  <span style="font-size:13px;opacity:.5">编辑模式 · 按 E 关闭</span>
  <button onclick="toggleEdit()">✏️ 切换编辑</button>
  <button onclick="exportHTML()">⬇️ 导出</button>
  <button onclick="this.closest('#editBar').style.display='none'">✕</button>
</div>
<script>
function scaleCanvas(){{
  const d=document.getElementById('deck'),W=+d.dataset.w||1920,H=+d.dataset.h||1080;
  const s=Math.min(innerWidth/W,innerHeight/H);
  d.style.cssText=`width:${{W}}px;height:${{H}}px;transform:scale(${{s}});transform-origin:top left;margin-left:${{(innerWidth-W*s)/2}}px;margin-top:${{(innerHeight-H*s)/2}}px;`;
}}
window.addEventListener('resize',scaleCanvas);scaleCanvas();
const slides=[...document.querySelectorAll('.slide')],prog=document.getElementById('prog');
let cur=0;
function goto(n){{slides[cur].classList.remove('active');cur=Math.max(0,Math.min(n,slides.length-1));slides[cur].classList.add('active');prog.style.width=((cur+1)/slides.length*100)+'%';}}
document.addEventListener('keydown',e=>{{
  if(e.key==='ArrowRight'||e.key===' '){{e.preventDefault();goto(cur+1);}}
  if(e.key==='ArrowLeft'){{e.preventDefault();goto(cur-1);}}
  if(e.key==='e'){{const b=document.getElementById('editBar');b.style.display=b.style.display==='flex'?'none':'flex';}}
}});
document.addEventListener('click',e=>{{if(!e.target.closest('#editBar,button,a,[contenteditable]'))goto(cur+1);}});
let tx=0;
document.addEventListener('touchstart',e=>{{tx=e.touches[0].clientX;}});
document.addEventListener('touchend',e=>{{const dx=e.changedTouches[0].clientX-tx;if(Math.abs(dx)>50){{dx<0?goto(cur+1):goto(cur-1);}}}});
let em=false;
function toggleEdit(){{em=!em;document.querySelectorAll('.editable').forEach(el=>{{el.contentEditable=em?'true':'false';}});}}
function exportHTML(){{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['<!DOCTYPE html>\\n'+document.documentElement.outerHTML],{{type:'text/html'}}));a.download='slides-exported.html';a.click();}}
</script>
</body>
</html>'''


def main():
    args = sys.argv[1:]
    if not args:
        print("用法：python3 pdf_to_slides.py input.pdf [output.html] [--text]")
        sys.exit(1)

    pdf_path    = Path(args[0])
    text_mode   = '--text' in args
    output_path = None
    for a in args[1:]:
        if not a.startswith('--') and a.endswith('.html'):
            output_path = Path(a)
            break
    if not output_path:
        suffix = '-text.html' if text_mode else '-slides.html'
        output_path = pdf_path.with_name(pdf_path.stem + suffix)

    print(f"📂 读取：{pdf_path}")
    print(f"🎨 模式：{'文字提取' if text_mode else '图片渲染'}")

    if text_mode:
        count, slides_str = text_mode_html(pdf_path, pdf_path.stem)
    else:
        count, slides_str = image_mode_html(pdf_path, pdf_path.stem)

    html = build_html(count, slides_str, pdf_path.stem, 'text' if text_mode else 'image')
    output_path.write_text(html, encoding='utf-8')

    print(f"✅ 完成：{output_path}")
    print(f"   {count} 张 slides · 在浏览器打开 · E 键进入编辑模式")


if __name__ == '__main__':
    main()
