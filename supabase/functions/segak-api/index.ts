import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const CORS={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,x-client-info,apikey,content-type,x-app-password','Access-Control-Allow-Methods':'POST,OPTIONS'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...CORS,'Content-Type':'application/json; charset=utf-8'}});
const str=(v:unknown)=>String(v??'').trim();
const num=(v:unknown)=>v===''||v===null||v===undefined?null:(Number.isFinite(Number(v))?Number(v):null);
const int=(v:unknown)=>{const n=num(v);return n===null?null:Math.round(n)};
const genderCode=(g:unknown):'L'|'P'|''=>{const v=str(g).toUpperCase();return ['LELAKI','L','MALE','M'].includes(v)?'L':['PEREMPUAN','P','FEMALE','F'].includes(v)?'P':''};
const gender=(g:unknown):'LELAKI'|'PEREMPUAN'|null=>genderCode(g)==='L'?'LELAKI':genderCode(g)==='P'?'PEREMPUAN':null;

const BMI:Record<'L'|'P',Record<number,[number,number,number]>>={
 L:{7:[13,17,19],8:[13.2,17.4,19.7],9:[13.4,17.9,20.5],10:[13.6,18.5,21.4],11:[14,19.2,22.5],12:[14.4,19.9,23.6],13:[14.8,20.8,24.8],14:[15.4,21.8,25.9],15:[15.9,22.7,27],16:[16.4,23.5,27.9],17:[16.8,24.3,28.6]},
 P:{7:[12.6,17.3,19.8],8:[12.8,17.7,20.6],9:[13,18.3,21.5],10:[13.4,19,22.6],11:[13.8,19.9,23.7],12:[14.3,20.8,25],13:[14.8,21.8,26.2],14:[15.3,22.7,27.3],15:[15.8,23.5,28.2],16:[16.1,24.1,28.9],17:[16.3,24.5,29.3]}
};
type Bands={step:[number,number,number,number],push:[number,number,number,number],curl:[number,number,number,number],reach:[number,number,number,number]};
const SEGAK:Record<number,Record<'L'|'P',Bands>>={
 10:{L:{step:[79,101,125,148],push:[15,13,9,7],curl:[18,15,11,8],reach:[37,32,25,19]},P:{step:[84,108,133,158],push:[21,17,13,9],curl:[18,15,11,8],reach:[35,30,24,18]}},
 11:{L:{step:[78,101,124,147],push:[16,13,9,7],curl:[19,16,12,8],reach:[39,32,25,18]},P:{step:[86,111,136,161],push:[21,17,13,9],curl:[18,15,11,8],reach:[36,31,25,19]}},
 12:{L:{step:[77,100,123,146],push:[18,15,11,8],curl:[20,16,12,8],reach:[39,32,25,19]},P:{step:[83,107,132,156],push:[21,18,13,9],curl:[18,15,11,8],reach:[38,32,25,20]}}
};
const bmiValue=(h:number|null,w:number|null)=>!h||!w?null:Math.round(w/Math.pow(h/100,2)*10)/10;
const bmiStatus=(age:number|null,g:unknown,b:number|null)=>{const c=genderCode(g);const band=age&&c?BMI[c][age]:undefined;if(!band||b===null)return null;return b<=band[0]?'Susut Berat Badan':b<=band[1]?'Berat Badan Normal':b<=band[2]?'Berlebihan Berat Badan':'Obes'};
const low=(v:number,b:[number,number,number,number])=>v<=b[0]?5:v<=b[1]?4:v<=b[2]?3:v<=b[3]?2:1;
const high=(v:number,b:[number,number,number,number])=>v>=b[0]?5:v>=b[1]?4:v>=b[2]?3:v>=b[3]?2:1;
const score=(age:number|null,g:unknown,t:'step'|'push'|'curl'|'reach',v:number|null)=>{const c=genderCode(g);const b=age&&c?SEGAK[age]?.[c]:undefined;if(!b||v===null)return null;return t==='step'?low(v,b.step):high(v,b[t])};
const overall=(n:number|null)=>n===null?{grade:null,status:null}:n>=18?{grade:'A',status:'KECERGASAN SANGAT TINGGI'}:n>=15?{grade:'B',status:'KECERGASAN TINGGI'}:n>=12?{grade:'C',status:'CERGAS'}:n>=8?{grade:'D',status:'KURANG CERGAS'}:n>=4?{grade:'E',status:'TIDAK CERGAS'}:{grade:null,status:null};
const derive=(input:any,yearLevel:number,g:unknown)=>{const age=int(input.umur??input.age)??yearLevel+6;const h=num(input.tinggi??input.height_cm??input.heightCm);const w=num(input.berat??input.weight_kg??input.weightKg);const b=bmiValue(h,w);const step=int(input.naikTurunBangku??input.step_pulse??input.stepPulse);const push=int(input.tekanTubi??input.push_ups??input.pushUps);const curl=int(input.ringkukTubiSepara??input.curl_ups??input.curlUps);const reach=int(input.jangkauanMelunjur??input.sit_reach_cm??input.sitReachCm);let total:number|null=null;if(yearLevel>=4&&[step,push,curl,reach].every(x=>x!==null)){const ss=[score(age,g,'step',step),score(age,g,'push',push),score(age,g,'curl',curl),score(age,g,'reach',reach)];if(ss.every(x=>x!==null))total=(ss as number[]).reduce((a,x)=>a+x,0)}const o=overall(total);return{age,height_cm:h,weight_kg:w,bmi:b,bmi_status:bmiStatus(age,g,b),step_pulse:step,push_ups:push,curl_ups:curl,sit_reach_cm:reach,total_score:total,grade:o.grade,fitness_status:o.status,test_date:str(input.tarikhUjian??input.test_date??input.testDate)||null}};
const client=(r:any,g:unknown,yearLevel:number)=>{const d=derive(r||{},yearLevel,g);return{umur:d.age,tinggi:d.height_cm??'',berat:d.weight_kg??'',bmi:d.bmi??'',statusBmi:d.bmi_status??'',naikTurunBangku:d.step_pulse??'',tekanTubi:d.push_ups??'',ringkukTubiSepara:d.curl_ups??'',jangkauanMelunjur:d.sit_reach_cm??'',jumlahSkor:d.total_score??'',gred:d.grade??'',statusKecergasan:d.fitness_status??'',tarikhUjian:d.test_date??''}};
const pdfRecord=(r:any,g:unknown)=>{const d=derive(r,Number(r.year_level),g);return{sessionYear:r.session_year,yearLevel:r.year_level,className:r.class_code,pengisian:r.pengisian,umur:d.age,tinggi:d.height_cm,berat:d.weight_kg,bmi:d.bmi,statusBmi:d.bmi_status,naikTurunBangku:d.step_pulse,tekanTubi:d.push_ups,ringkukTubiSepara:d.curl_ups,jangkauanMelunjur:d.sit_reach_cm,jumlahSkor:d.total_score,gred:d.grade,statusKecergasan:d.fitness_status,tarikhUjian:d.test_date}};

Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:CORS});
 if(req.method!=='POST')return json({success:false,error:'Method not allowed'},405);
 const appPassword=req.headers.get('x-app-password')||'';
 const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!key)return json({success:false,error:'Konfigurasi Supabase belum lengkap.'},500);
 const db=createClient(url,key,{auth:{persistSession:false}});
 const {data:authorized,error:authError}=await db.rpc('segak_bridge_authorized',{p_bridge_token:appPassword});
 if(authError||authorized!==true)return json({success:false,error:'PASSWORD_TIDAK_SAH'},401);
 const rpc=async(name:string,args:Record<string,unknown>={})=>{const {data,error}=await db.rpc(name,{p_bridge_token:appPassword,...args});if(error)throw error;return data||[]};
 try{
  const body=await req.json().catch(()=>({}));const action=str(body.action||'auth');
  if(action==='auth')return json({success:true});
  if(action==='getConfig'){
   const sessions=await rpc('segak_bridge_sessions');const {data:s}=await db.from('segak_settings').select('value').eq('key','school_name').maybeSingle();
   return json({success:true,sessions:sessions.map((x:any)=>Number(x.year)),schoolName:s?.value||'SEKOLAH KEBANGSAAN SUNGAI ABONG'});
  }
  if(action==='getClasses'){
   const year=Number(body.year);if(!Number.isFinite(year))return json({success:false,error:'Sesi tidak sah.'},400);const classes=await rpc('segak_bridge_classes',{p_year:year});return json({success:true,classes:classes.map((x:any)=>x.code),classDetails:classes});
  }
  if(action==='getStudentsByClass'){
   const year=Number(body.year),className=str(body.className),pengisian=Number(body.pengisian||1);if(!Number.isFinite(year)||!className||![1,2].includes(pengisian))return json({success:false,error:'Parameter kelas/pengisian tidak sah.'},400);
   const roster=await rpc('segak_bridge_roster',{p_year:year,p_class_code:className});const ids=roster.map((x:any)=>x.student_id);if(!ids.length)return json({success:true,className,students:[]});
   const [{data:profiles,error:pe},{data:records,error:re}]=await Promise.all([db.from('segak_student_profiles').select('*').in('student_id',ids),db.from('segak_records').select('*').eq('session_year',year).eq('pengisian',pengisian).in('student_id',ids)]);if(pe)throw pe;if(re)throw re;
   const pm=new Map((profiles||[]).map((x:any)=>[x.student_id,x])),rm=new Map((records||[]).map((x:any)=>[x.student_id,x]));
   const students=roster.map((m:any,i:number)=>{const p:any=pm.get(m.student_id)||{},r:any=rm.get(m.student_id)||{};return{rowNumber:i+1,bil:i+1,studentKey:m.student_id,studentId:m.student_id,namaMurid:m.full_name,className:m.class_code,classFullName:m.class_name,yearLevel:m.year_level,classTeacherName:m.class_teacher_name,jantina:p.gender||'',mykid:p.mykid||'',noTelPenjaga:p.guardian_phone||'',jantinaPerluSemak:!p.gender,...client(r,p.gender,Number(m.year_level))}});
   return json({success:true,className,classInfo:roster[0]?{className:roster[0].class_name,classTeacherName:roster[0].class_teacher_name,yearLevel:roster[0].year_level}:null,students});
  }
  if(action==='getClassStatuses'){
   const year=Number(body.year),pengisian=Number(body.pengisian||1);const roster=await rpc('segak_bridge_year_roster',{p_year:year});const ids=roster.map((x:any)=>x.student_id);if(!ids.length)return json({success:true,statuses:[]});
   const [{data:profiles,error:pe},{data:records,error:re}]=await Promise.all([db.from('segak_student_profiles').select('student_id,gender').in('student_id',ids),db.from('segak_records').select('student_id,height_cm,weight_kg,step_pulse,push_ups,curl_ups,sit_reach_cm').eq('session_year',year).eq('pengisian',pengisian).in('student_id',ids)]);if(pe)throw pe;if(re)throw re;
   const pm=new Map((profiles||[]).map((x:any)=>[x.student_id,x])),rm=new Map((records||[]).map((x:any)=>[x.student_id,x])),groups=new Map<string,any[]>();for(const m of roster){if(!groups.has(m.class_code))groups.set(m.class_code,[]);groups.get(m.class_code)!.push(m)}
   const statuses=[...groups.entries()].map(([className,members])=>{const yl=Number(members[0]?.year_level||0);const bmiComplete=members.length>0&&members.every((m:any)=>{const p:any=pm.get(m.student_id),r:any=rm.get(m.student_id);return!!p?.gender&&r?.height_cm!=null&&r?.weight_kg!=null});const segakComplete=yl<4?false:members.length>0&&members.every((m:any)=>{const p:any=pm.get(m.student_id),r:any=rm.get(m.student_id);return!!p?.gender&&[r?.step_pulse,r?.push_ups,r?.curl_ups,r?.sit_reach_cm].every(v=>v!=null)});return{className,yearLevel:yl,totalStudents:members.length,bmiComplete,segakComplete}});return json({success:true,statuses});
  }
  if(action==='saveClassRecords'){
   const year=Number(body.year),className=str(body.className),pengisian=Number(body.pengisian||1),incoming=Array.isArray(body.students)?body.students:[];if(!Number.isFinite(year)||!className||![1,2].includes(pengisian))return json({success:false,error:'Parameter simpan tidak sah.'},400);
   const roster=await rpc('segak_bridge_roster',{p_year:year,p_class_code:className}),map=new Map(roster.map((x:any)=>[x.student_id,x])),profiles:any[]=[],records:any[]=[];
   for(const item of incoming){const id=str(item.studentId||item.studentKey),m:any=map.get(id);if(!m)continue;const g=gender(item.jantina);profiles.push({student_id:id,full_name_cache:m.full_name,gender:g,mykid:str(item.mykid)||null,guardian_phone:str(item.noTelPenjaga)||null});records.push({student_id:id,session_year:year,class_id:m.class_id,class_code:m.class_code,class_name:m.class_name,year_level:m.year_level,pengisian,...derive(item,Number(m.year_level),g),source:'webapp'})}
   if(profiles.length){const {error}=await db.from('segak_student_profiles').upsert(profiles,{onConflict:'student_id'});if(error)throw error}if(records.length){const {error}=await db.from('segak_records').upsert(records,{onConflict:'student_id,session_year,pengisian'});if(error)throw error}
   const {error:ae}=await db.from('segak_audit_log').insert({action:'save_class_records',session_year:year,class_code:className,detail:{pengisian,saved:records.length}});if(ae)console.warn(ae);return json({success:true,saved:records.length});
  }
  if(action==='getStudentBssr'){
   const studentId=str(body.studentId||body.studentKey),fallback=str(body.namaMurid);if(!studentId)return json({success:false,error:'studentId diperlukan.'},400);
   const [{data:p,error:pe},{data:records,error:re},{data:set}]=await Promise.all([db.from('segak_student_profiles').select('*').eq('student_id',studentId).maybeSingle(),db.from('segak_records').select('*').eq('student_id',studentId).gte('year_level',4).lte('year_level',6).order('session_year').order('pengisian'),db.from('segak_settings').select('value').eq('key','school_name').maybeSingle()]);if(pe)throw pe;if(re)throw re;
   return json({success:true,history:{schoolName:set?.value||'SEKOLAH KEBANGSAAN SUNGAI ABONG',studentKey:studentId,namaMurid:p?.full_name_cache||fallback,mykid:p?.mykid||'',jantina:p?.gender||'',noTelPenjaga:p?.guardian_phone||'',records:(records||[]).map((r:any)=>pdfRecord(r,p?.gender))}});
  }
  if(action==='getClassBssr'){
   const year=Number(body.year),className=str(body.className);if(!Number.isFinite(year)||!className)return json({success:false,error:'Parameter kelas tidak sah.'},400);const roster=await rpc('segak_bridge_roster',{p_year:year,p_class_code:className}),ids=roster.map((x:any)=>x.student_id);if(!ids.length)return json({success:true,histories:[]});
   const [{data:profiles,error:pe},{data:records,error:re},{data:set}]=await Promise.all([db.from('segak_student_profiles').select('*').in('student_id',ids),db.from('segak_records').select('*').in('student_id',ids).gte('year_level',4).lte('year_level',6).order('student_id').order('session_year').order('pengisian'),db.from('segak_settings').select('value').eq('key','school_name').maybeSingle()]);if(pe)throw pe;if(re)throw re;const pm=new Map((profiles||[]).map((x:any)=>[x.student_id,x])),rm=new Map<string,any[]>();for(const r of records||[]){if(!rm.has(r.student_id))rm.set(r.student_id,[]);rm.get(r.student_id)!.push(r)}
   const histories=roster.map((m:any)=>{const p:any=pm.get(m.student_id)||{};return{schoolName:set?.value||'SEKOLAH KEBANGSAAN SUNGAI ABONG',studentKey:m.student_id,namaMurid:m.full_name,mykid:p.mykid||'',jantina:p.gender||'',noTelPenjaga:p.guardian_phone||'',records:(rm.get(m.student_id)||[]).map((r:any)=>pdfRecord(r,p.gender))}});return json({success:true,histories});
  }
  return json({success:false,error:`Action tidak dikenali: ${action}`},400);
 }catch(e){console.error(e);return json({success:false,error:e instanceof Error?e.message:String(e)},500)}
});
