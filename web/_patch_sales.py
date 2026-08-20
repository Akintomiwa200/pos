from pathlib import Path

p = Path(r"C:\Users\DELL\Desktop\POS\web\src\components\HqDashboard.tsx")
text = p.read_text(encoding="utf-8")
needle = '        <div className="rounded-[24px] bg-white p-4 shadow-[0_1px_2px_rgba(28,28,30,0.04)]">'
start = text.find(needle)
if start < 0:
    raise SystemExit("start not found")
close = text.rfind("        </div>\n      </div>\n    </div>\n  );")
if close < 0:
    raise SystemExit("close not found")
new = "        <SalesTeamCard />\n"
text = text[:start] + new + text[close + len("        </div>\n") :]
p.write_text(text, encoding="utf-8")
print("replaced", start, "to", close)
print(repr(text[start - 40 : start + 60]))
