import MarkdownIt from 'markdown-it';
import type {Repo} from './github';
import {sourceUrl} from './github';
const md=new MarkdownIt({html:false,linkify:false});
md.renderer.rules.image=(tokens,i)=>`<span class="image-placeholder">[Image: ${md.utils.escapeHtml(tokens[i].content)}]</span>`;
const fence=md.renderer.rules.fence!;
md.renderer.rules.fence=(tokens,i,options,env,self)=>tokens[i].info.trim()==='mermaid'
  ? `<pre class="mermaid-source">${md.utils.escapeHtml(tokens[i].content)}</pre>`
  : fence(tokens,i,options,env,self);
md.renderer.rules.link_open=(tokens,i,options,env:{repo:Repo;sha:string;file:string},self)=>{
  const token=tokens[i]; const href=token.attrGet('href')??'';
  if(href && !/^(?:https?:|mailto:|#)/i.test(href)) {
    const parts=env.file.split('/');parts.pop();
    for(const part of href.split('/')){if(part==='..')parts.pop();else if(part!=='.')parts.push(part);}
    token.attrSet('href',sourceUrl(env.repo,env.sha,parts.join('/')));
  }
  token.attrSet('rel','noopener noreferrer');
  if(!href.startsWith('#'))token.attrSet('target','_blank');
  return self.renderToken(tokens,i,options);
};
export function renderMarkdown(body:string,repo:Repo,sha:string,file:string){return md.render(body,{repo,sha,file});}
