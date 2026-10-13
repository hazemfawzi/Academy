"""Read public vendor pages; record source excerpts without executing page code."""
from html.parser import HTMLParser
from urllib.request import Request, urlopen
import json
from pathlib import Path
class Visible(HTMLParser):
    def __init__(self): super().__init__(); self.hidden=0; self.rows=[]
    def handle_starttag(self,t,a):
        if t in ('script','style'): self.hidden+=1
    def handle_endtag(self,t):
        if t in ('script','style'): self.hidden=max(0,self.hidden-1)
    def handle_data(self,s):
        if not self.hidden and s.strip(): self.rows.append(' '.join(s.split()))
vendors={'TeamUp':'https://goteamup.com/','Jackrabbit Class':'https://www.jackrabbitclass.com/','iClassPro':'https://www.iclasspro.com/','LeagueApps':'https://leagueapps.com/','TeamSnap':'https://www.teamsnap.com/'}
results=[]
for name,url in vendors.items():
    try:
        with urlopen(Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=25) as r:
            html=r.read().decode(errors='replace');final=r.url
        parser=Visible();parser.feed(html)
        keywords=['register','registration','payment','billing','schedule','scheduling','parent','family','families','attendance','class','communication','report','member','waitlist','wait list','staff']
        excerpts=[s for s in parser.rows if any(k in s.lower() for k in keywords) and len(s)>15]
        record={'vendor':name,'url':url,'final_url':final,'excerpts':list(dict.fromkeys(excerpts))[:30]}
    except Exception as e: record={'vendor':name,'url':url,'error':str(e)}
    results.append(record)
    text=json.dumps(record,ensure_ascii=False)[:9000].replace('%','%25').replace('\r','%0D').replace('\n','%0A')
    print('::notice title=Market source::'+text,flush=True)
Path('/tmp/academy-market.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
