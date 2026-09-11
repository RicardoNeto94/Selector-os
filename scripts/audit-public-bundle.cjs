// Read-only check. Reports variable names, never their values.
const fs=require('node:fs');const path=require('node:path');const {parseEnv}=require('node:util');
const env=fs.existsSync('.env.local')?parseEnv(fs.readFileSync('.env.local','utf8')):{};
const sensitive=Object.entries(env).filter(([name,value])=>!name.startsWith('NEXT_PUBLIC_')&&/SECRET|PASSWORD|TOKEN|PRIVATE|SERVICE_ROLE|OPENAI_API_KEY|RESEND_API_KEY/.test(name)&&value.length>=12);
function walk(folder){return fs.readdirSync(folder,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(folder,entry.name)):[path.join(folder,entry.name)]);}
const files=walk('.next/static').filter(file=>/\.(js|css|map|json)$/.test(file));let leaks=0;
for(const file of files){const content=fs.readFileSync(file,'utf8');for(const [name,value] of sensitive)if(content.includes(value)){console.error('Potential exposed variable:',name,'in',file);leaks++;}}
console.log(JSON.stringify({clientFilesScanned:files.length,privateValuesChecked:sensitive.length,leaks}));if(leaks)process.exitCode=1;
