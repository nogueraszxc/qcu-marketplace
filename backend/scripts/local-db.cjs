// Local development only. Production uses a separately managed MongoDB.
const {MongoMemoryReplSet}=require('mongodb-memory-server');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');

(async()=>{
 const root=path.resolve(__dirname,'..');
 const runtimeFile=path.join(root,'.local','runtime.json');
 let previousPath;
 try{previousPath=JSON.parse(fs.readFileSync(runtimeFile,'utf8')).dbPath;}catch{}
 const dbPath=path.resolve(process.env.LOCAL_DB_PATH||previousPath||path.join(root,'.local','mongodb'));
 fs.mkdirSync(dbPath,{recursive:true});
 const replica=await MongoMemoryReplSet.create({
  instanceOpts:[{port:Number(process.env.LOCAL_MONGO_PORT)||27018,dbPath,args:['--wiredTigerCacheSizeGB','0.25']}],
  replSet:{count:1,name:'qcu-local',storageEngine:'wiredTiger',ip:'127.0.0.1'},
 });
 const mongoUri=replica.getUri('qcu_marketplace_local');
 fs.mkdirSync(path.join(root,'.local'),{recursive:true});
 fs.writeFileSync(runtimeFile,JSON.stringify({mongoUri,dbPath,localOnly:true},null,2));
 const external=process.env.LOCAL_ENABLE_EXTERNAL_SERVICES==='true';
 const child=spawn(process.execPath,[path.join(root,'server.js')],{
  cwd:root,stdio:'inherit',windowsHide:true,
  env:{...process.env,NODE_ENV:'development',MONGO_URI:mongoUri,HOST:'127.0.0.1',PORT:process.env.PORT||'5000',APP_ORIGIN:process.env.APP_ORIGIN||'http://127.0.0.1:3000,http://localhost:3000',PUBLIC_LAUNCH_ENABLED:'false',...(external?{}:{SMTP_HOST:'',SMTP_FROM:'',FIREBASE_PROJECT_ID:''})},
 });
 console.log('Local persistent MongoDB started on loopback. Existing MONGO_URI was not used.');
 console.log('Database files: '+dbPath);
 let stopping=false;
 const stop=async()=>{if(stopping)return;stopping=true;child.kill('SIGTERM');await replica.stop({doCleanup:false,force:false});};
 process.on('SIGINT',()=>stop().then(()=>process.exit(0)));
 process.on('SIGTERM',()=>stop().then(()=>process.exit(0)));
 child.once('exit',code=>stop().then(()=>process.exit(code||0)));
 child.once('error',()=>stop().then(()=>process.exit(1)));
})().catch(error=>{console.error('Local database could not start: '+error.message);process.exit(1)});
