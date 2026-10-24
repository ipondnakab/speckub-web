import { describe, expect, it } from 'vitest';
import { discoverEndpointMarkdown } from '@speckub/schema';
import { collect, discover, eligible } from './discovery';
import { parseRepo } from './github';
import { renderMarkdown } from './markdown';
const spec='---\nspeckub: true\nspecVersion: 1\nid: users.read\nkind: http\nmethod: GET\npath: /users/{id}\nsummary: Read user\nsource:\n  - api/users.ts\n---\n## Custom section\nCustom body';
describe('browser discovery matches the released contract',()=>{
 for(const [label,text] of Object.entries({valid:spec,legacy:spec.replace('speckub: true\n',''),template:spec.replace('speckub: true','speckub: false'),invalid:spec.replace('method: GET','method: INVALID'),traversal:spec.replace('api/users.ts','../users.ts'),duplicateParam:spec.replace('/users/{id}','/users/{id}/{id}'),ordinary:'# Readme',malformed:spec.replace('summary: Read user','summary: [bad')})){
 it(label,()=>{const expected=discoverEndpointMarkdown(text);const actual=discover(text,'custom/routes.md');expect(Boolean(actual.spec)).toBe(expected?.success===true);expect(Boolean(actual.error)).toBe(expected?.success===false);if(expected?.success)expect(actual.spec).toMatchObject({...expected.data,body:expected.body});});
 }
 it('keeps custom content and discovers outside docs/api',()=>expect(discover(spec,'services/x/contract.md').spec?.body).toContain('Custom section'));
 it('excludes templates, dependencies and symlink candidates at transport level',()=>{expect(eligible('.speckub/examples/api.md')).toBe(false);expect(eligible('node_modules/a/doc.md')).toBe(false);expect(eligible('services/auth/spec.MD')).toBe(true);});
 it('reports duplicates deterministically',()=>{const r=collect([{file:'z.md',text:spec},{file:'a.md',text:spec}]);expect(r.specs[0].file).toBe('a.md');expect(r.issues[0]).toContain('duplicate');});
});
describe('repository input',()=>{it('accepts only public GitHub URL shapes',()=>{expect(parseRepo('https://github.com/acme/api.git')).toBe('acme/api');expect(parseRepo('acme/api')).toBe('acme/api');for(const bad of ['https://evil.com/acme/api','https://github.com/acme/api/tree/main','../..','owner/repo?token=secret'])expect(()=>parseRepo(bad)).toThrow();});});
describe('untrusted Markdown',()=>{it('escapes HTML, disallows script links, does not fetch images, pins source links',()=>{const result=renderMarkdown('<script>alert(1)</script>\n\n[x](javascript:alert(1))\n\n![tracking](https://evil.com/pixel)\n\n[code](../api.ts)',{owner:'a',name:'b',full:'a/b',defaultBranch:'main'},'123','docs/spec.md');expect(result).not.toContain('<script>');expect(result).not.toContain('<img');expect(result).not.toContain('href="javascript:');expect(result).toContain('https://github.com/a/b/blob/123/api.ts');});});
