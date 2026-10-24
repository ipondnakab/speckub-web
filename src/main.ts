import './style.css';
import mermaidUrl from '@mermaid-js/tiny/dist/mermaid.tiny.js?url';
let renderer: Promise<Mermaid> | undefined;
function loadMermaid(): Promise<Mermaid> {
 return renderer ??= new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=mermaidUrl;script.onload=()=>resolve(window.mermaid);script.onerror=()=>{renderer=undefined;script.remove();reject(new Error('Could not load diagram renderer'));};document.head.append(script);});
}
import type { Spec } from './discovery';
import { openRepo, loadBranch, sourceUrl, type Repo } from './github';
import { renderMarkdown } from './markdown';
const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`<header><a class="brand" href="/" aria-label="SpecKub home"><span class="brand-icon">s<span>k</span></span>SpecKub<span class="brand-label">EXPLORER</span></a><a class="github-link" href="https://github.com/ipondnakab/speckub" target="_blank" rel="noreferrer">About SpecKub ↗</a></header>
<main><section class="hero"><div class="eyebrow"><span class="dot"></span> YOUR CODE. YOUR SPECS. EVERY BRANCH.</div><h1>Your APIs,<br><span>an open book.</span></h1><p>Turn a public repository into a readable API reference.<br>Choose a branch. Explore the specs. Stay close to the code.</p>
<form id="repo-form"><label for="repo-input">PUBLIC GITHUB REPOSITORY</label><div class="input-row"><span aria-hidden="true">⌘</span><input id="repo-input" placeholder="github.com/owner/repository" autocomplete="off" required aria-label="Public GitHub repository"><button type="submit">Open repository <span>↗</span></button></div></form>
<div class="try">Try it with <button id="example">ipondnakab/speckub ↗</button><span>Public repos · No sign-in needed</span></div></section>
<div id="status" role="status" aria-live="polite"></div><section id="workspace" hidden><div class="repo-bar"><div><span class="eyebrow">REPOSITORY</span><h2 id="repo-name"></h2></div><div class="branch-control"><label for="branch">Branch</label><select id="branch"></select><button id="refresh" class="secondary">Refresh</button></div></div><div id="snapshot"></div><details id="issues" hidden><summary></summary><ul></ul></details>
<div class="reader"><aside><label class="eyebrow" for="search">API REFERENCE</label><input id="search" type="search" placeholder="Search endpoints…"><label class="sr-only" for="method">HTTP method</label><select id="method"><option value="">All methods</option>${['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS'].map(m=>`<option>${m}</option>`).join('')}</select><div id="count"></div><nav id="endpoints" aria-label="Endpoints"></nav></aside><article id="document"></article></div></section>
<section id="intro" class="intro"><div><span class="step">01 / CONNECT</span><h3>One link. Every endpoint.</h3><p>Discover SpecKub Markdown across your repository, wherever your team keeps it.</p></div><div><span class="step">02 / EXPLORE</span><h3>Follow the right branch.</h3><p>Read contracts, service relationships, and sequence diagrams for a specific revision.</p></div><div><span class="step">03 / SHARE</span><h3>Keep everyone in sync.</h3><p>Share a link to an endpoint. Your Markdown stays in Git, alongside the code.</p></div></section></main><footer><span>SpecKub / Open-source API documentation</span><span>Built for humans. Ready for agents.</span></footer>`;
function el<T extends HTMLElement=HTMLElement>(id:string){return document.getElementById(id)! as T;}
let repo:Repo|undefined, specs:Spec[]=[],sha='',selected='',controller=new AbortController(),generation=0;
const params=new URLSearchParams(location.search);
const input=el<HTMLInputElement>('repo-input');input.value=params.get('repo')??'';
function status(message:string,error=false){el('status').textContent=message;el('status').className=error?'error':'loading';}
function share(){if(!repo)return;const p=new URLSearchParams({repo:repo.full,branch:el<HTMLSelectElement>('branch').value});if(selected)p.set('endpoint',selected);history.replaceState(null,'',`?${p}`);}
function start(){controller.abort();controller=new AbortController();generation++;return controller.signal;}
async function connect(){
 const signal=start();el('workspace').hidden=true;status('Opening repository…');
 try{const result=await openRepo(input.value.replace(/^github\.com\//,'https://github.com/'),signal);signal.throwIfAborted();repo=result.repo;
 el('repo-name').textContent=repo.full;const branch=el<HTMLSelectElement>('branch');branch.replaceChildren(...result.branches.map(name=>new Option(name,name)));
 const requested=params.get('repo')===repo.full?params.get('branch'):null;branch.value=requested && result.branches.includes(requested)?requested:repo.defaultBranch;
 selected=params.get('repo')===repo.full?params.get('endpoint')??'':'';el('workspace').hidden=false;el('intro').hidden=true;document.body.classList.add('has-repo');await readBranch();
 }catch(e){if(!signal.aborted)status(e instanceof Error?e.message:'Unable to open repository.',true);}
}
async function readBranch(){
 if(!repo)return;const signal=start();specs=[];el('endpoints').replaceChildren();el('document').textContent='Loading this branch…';el('issues').hidden=true;el('snapshot').textContent='';
 try{const result=await loadBranch(repo,el<HTMLSelectElement>('branch').value,signal,t=>status(t));signal.throwIfAborted();specs=result.specs;sha=result.sha;
 el('snapshot').textContent=`${specs.length} endpoints · ${result.filesRead} Markdown files read · commit ${sha.slice(0,7)}`;
 if(result.issues.length){el('issues').hidden=false;el('issues').querySelector('summary')!.textContent=`${result.issues.length} discovery issues — results may be incomplete`;el('issues').querySelector('ul')!.replaceChildren(...result.issues.map(s=>{const li=document.createElement('li');li.textContent=s;return li;}));}
 selected=specs.some(s=>s.id===selected)?selected:specs[0]?.id??'';status('');share();renderList();renderDoc();
 }catch(e){if(!signal.aborted){status(e instanceof Error?e.message:'Could not load branch.',true);el('document').textContent='This branch could not be loaded. Choose another branch or retry.';}}
}
function renderList(){const q=el<HTMLInputElement>('search').value.toLowerCase();const method=el<HTMLSelectElement>('method').value;
 const filtered=specs.filter(s=>(!method||s.method===method)&&`${s.id} ${s.path} ${s.summary} ${s.body}`.toLowerCase().includes(q));
 el('count').textContent=`${filtered.length} endpoints`;
 el('endpoints').replaceChildren(...filtered.map(s=>{const b=document.createElement('button');b.className=`endpoint ${s.id===selected?'active':''}`;b.setAttribute('aria-current',s.id===selected?'true':'false');const badge=document.createElement('span');badge.className=`method ${s.method}`;badge.textContent=s.method;const path=document.createElement('strong');path.textContent=s.path;const title=document.createElement('small');title.textContent=s.summary;b.append(badge,path,title);b.onclick=()=>{selected=s.id;share();renderList();renderDoc();};return b;}));
 if(!filtered.length)el('endpoints').textContent=specs.length?'No matching endpoints.':'No specs discovered.';
}
async function renderDoc(){const version=++generation;const doc=el('document');const spec=specs.find(s=>s.id===selected);doc.replaceChildren();if(!spec||!repo){doc.innerHTML='<div class="empty"><span class="eyebrow">START WITH A SPEC</span><h2>No API specs on this branch yet.</h2><p>Add Markdown with <code>speckub: true</code> and valid SpecKub frontmatter anywhere in the repository. Templates and generated folders are excluded.</p><a href="https://github.com/ipondnakab/speckub" target="_blank" rel="noreferrer">Create your first spec ↗</a></div>';return;}
 const top=document.createElement('div');top.className='doc-top';const identity=document.createElement('span');identity.className='eyebrow';identity.textContent=spec.id;const copy=document.createElement('button');copy.className='secondary';copy.textContent='Copy link';copy.onclick=async()=>{try{await navigator.clipboard.writeText(location.href);copy.textContent='Copied';}catch{copy.textContent='Copy URL from address bar';}};top.append(identity,copy);
 const title=document.createElement('h2');title.textContent=spec.summary;const route=document.createElement('div');route.className='route';const method=document.createElement('span');method.className=`method ${spec.method}`;method.textContent=spec.method;const path=document.createElement('code');path.textContent=spec.path;route.append(method,path);
 const file=document.createElement('a');file.href=sourceUrl(repo,sha,spec.file);file.textContent=`${spec.file} ↗`;file.target='_blank';file.rel='noreferrer';file.className='file-link';const prose=document.createElement('div');prose.className='prose';prose.innerHTML=renderMarkdown(spec.body,repo,sha,spec.file);
 doc.append(top,title,route,file,prose);
 const headings=[...prose.querySelectorAll<HTMLElement>('h1,h2,h3')];const toc=document.createElement('nav');toc.className='toc';toc.setAttribute('aria-label','On this page');const anchors=new Map<string,number>();headings.forEach((h)=>{const base=(h.textContent??'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'section';const n=anchors.get(base)??0;anchors.set(base,n+1);h.id=n?`${base}-${n}`:base;const button=document.createElement('button');button.textContent=h.textContent;button.onclick=()=>h.scrollIntoView({behavior:'smooth',block:'start'});toc.append(button);});if(headings.length)doc.insertBefore(toc,prose);
 if(spec.source?.length){const sources=document.createElement('div');sources.className='sources';const label=document.createElement('h3');label.textContent='Source references';sources.append(label);for(const p of spec.source){const a=document.createElement('a');a.href=sourceUrl(repo,sha,p);a.textContent=p+' ↗';a.target='_blank';a.rel='noreferrer';sources.append(a);}doc.append(sources);}
 const diagrams=[...prose.querySelectorAll<HTMLElement>('.mermaid-source')];if(!diagrams.length)return;
 try{const mermaid=await loadMermaid();mermaid.initialize({startOnLoad:false,securityLevel:'strict',theme:'neutral',suppressErrorRendering:true,maxTextSize:50000,flowchart:{htmlLabels:false},secure:['securityLevel','startOnLoad','maxTextSize','suppressErrorRendering']});
 for(let i=0;i<diagrams.length;i++){if(version!==generation)return;const block=diagrams[i];try{const result=await mermaid.render(`diagram-${version}-${i}`,block.textContent??'');if(version!==generation)return;const view=document.createElement('div');view.className='diagram';view.innerHTML=result.svg;const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent='Diagram source';details.append(summary);block.replaceWith(view,details);details.append(block);}catch{const label=document.createElement('p');label.textContent='Diagram could not be rendered. Source is shown below.';block.before(label);}}
 }catch{const label=document.createElement('p');label.textContent='Diagram renderer unavailable. Sources are shown below.';prose.prepend(label);}
}
el('repo-form').onsubmit=e=>{e.preventDefault();void connect();};el('example').onclick=()=>{input.value='ipondnakab/speckub';void connect();};el('branch').onchange=()=>{selected='';void readBranch();};el('refresh').onclick=()=>void readBranch();el('search').oninput=renderList;el('method').onchange=renderList;
if(input.value)void connect();
