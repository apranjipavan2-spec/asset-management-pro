fetch('https://www.kalike.org').then(r=>r.text()).then(t=>{console.log((t.match(/<img.*?src=["'](.*?)["']/g)||[]).join('\n'))})
