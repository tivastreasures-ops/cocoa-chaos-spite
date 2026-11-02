// Read-only deployed-site checks. Never accepts passwords or starts service calls.
const origin=process.argv[2]||'https://chaos.toomanytabsopen.net';
const url=new URL(origin);
if(url.protocol!=='https:'||url.origin!==origin||url.username||url.password)throw Error('Supply an HTTPS origin only');
const report={origin,checkedAt:new Date().toISOString(),checks:[],androidAudio:'pending physical-device test',liveServices:'not invoked'};
for(const [path,expected,marker]of [['/health',200,null],['/',200,'Director’s entrance'],['/api/status',401,null],['/api/events',401,null],['/api/sebastian/events',401,null],['/manifest.webmanifest',200,'Cocoa & Chaos']]){
  try{
    const r=await fetch(origin+path,{redirect:'error',signal:AbortSignal.timeout(12000)}),body=await r.text();
    report.checks.push({path,status:r.status,passed:r.status===expected&&(!marker||body.includes(marker)),secureTransport:true,antiSniffHeader:r.headers.get('x-content-type-options')==='nosniff'});
  }catch(e){report.checks.push({path,passed:false,error:e.name==='TimeoutError'?'timeout':'HTTPS/request failed'});}
}
report.passed=report.checks.every(c=>c.passed);
console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
