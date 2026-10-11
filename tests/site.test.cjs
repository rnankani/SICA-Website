/* Static smoke checks: local assets/links and script syntax, no network. */
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const files=fs.readdirSync(root);
let count=0;
for(const file of files.filter(f=>f.endsWith('.js'))){new vm.Script(fs.readFileSync(path.join(root,file),'utf8'),{filename:file});count++;}
for(const file of files.filter(f=>f.endsWith('.html'))){
 const source=fs.readFileSync(path.join(root,file),'utf8');
 for(const match of source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
   if(!/\bsrc=|application\/(?:ld\+)?json|type=["']module/.test(match[1]) && match[2].trim())new vm.Script(match[2],{filename:file+' inline'});
 }
 // Leave external links to their owners; verify every actual local target.
 const markup=source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
 for(const match of markup.matchAll(/<(?:a|link|img)\b[^>]*\b(?:href|src)=["']([^"']+)["']/gi)){
   const target=match[1].split(/[?#]/)[0];
   if(!target || /^(?:[a-z]+:|\/\/)/i.test(target))continue;
   assert(fs.existsSync(path.join(root,decodeURIComponent(target))),file+' has a missing target: '+target);count++;
 }
 for(const match of source.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)){
   const target=match[1].split('?')[0];if(/^[a-z]+:/.test(target))continue;
   assert(fs.existsSync(path.join(root,target)),file+' has a missing script: '+target);count++;
 }
}
console.log('PASS '+count+' local link/asset/script checks, plus all inline script syntax');
