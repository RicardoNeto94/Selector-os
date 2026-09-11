import test from "node:test";
import assert from "node:assert/strict";
import { CONSENT_DURATION, readConsent, validateEnquiry, enquiryMailto } from "../src/lib/site/publicSite.mjs";
import { handleContact, trustedContactOrigin } from "../src/lib/site/contactHandler.mjs";

const valid = { name:"Test Person", email:"test@example.com", company:"Example Hotel", product:"Wine", message:"We would like to discuss a wine list.", website:"", token:"test-token" };
const env = { NODE_ENV:"production", RESEND_API_KEY:"test-only", CONTACT_FROM_EMAIL:"Vaxeron <hello@vaxeron.com>", TURNSTILE_SECRET_KEY:"test-only", NEXT_PUBLIC_TURNSTILE_SITE_KEY:"test-only" };
const request = (body = valid, origin = "https://vaxeron.com") => new Request("https://vaxeron.com/api/contact", { method:"POST", headers:{origin,"content-type":"application/json"}, body:JSON.stringify(body) });
test("privacy choices require explicit boolean, version and unexpired timestamp",()=>{
 const now=Date.now();
 assert.equal(readConsent(null),null); assert.equal(readConsent("bad"),null);
 for(const value of [{version:1,analytics:"yes",savedAt:now},{version:0,analytics:true,savedAt:now},{version:1,analytics:true,savedAt:now+1},{version:1,analytics:true,savedAt:now-CONSENT_DURATION}]) assert.equal(readConsent(JSON.stringify(value),now),null);
 assert.equal(readConsent(JSON.stringify({version:1,analytics:false,savedAt:now}),now).analytics,false);
 assert.equal(readConsent(JSON.stringify({version:1,analytics:true,savedAt:now}),now).analytics,true);
});
test("validation rejects malformed, missing, overlong and header-injection input",()=>{
 assert.deepEqual(validateEnquiry(valid).errors,{});
 for(const bad of [null,[],{}, {...valid,email:"test@example.com\r\nBcc:evil@example.com"},{...valid,message:"a".repeat(2001)},{...valid,name:"x"},{...valid,product:"<script>"}]) assert.ok(Object.keys(validateEnquiry(bad).errors).length);
 assert.ok(enquiryMailto(valid).startsWith("mailto:hello@vaxeron.com?subject="));
});
test("origin checks reject tenant subdomains, lookalikes and local production calls",()=>{
 assert.equal(trustedContactOrigin("https://vaxeron.com"),true);
 for(const host of ["https://vaxeron.com.evil.com","https://burman.vaxeron.com","http://vaxeron.com","http://localhost:3000",null]) assert.equal(trustedContactOrigin(host),false);
 assert.equal(trustedContactOrigin("http://localhost:3000",false),true);
});
test("unconfigured delivery fails closed with no outgoing requests",async()=>{
 const result=await handleContact(request(),{env:{NODE_ENV:"production"},fetcher:()=>{throw new Error("Must not call");}});
 assert.equal(result.status,503);
});
test("bad origins, honeypots and oversized bodies never call a provider",async()=>{
 for(const r of [request(valid,"https://evil.com"),request({...valid,website:"spam"}),request({...valid,message:"x".repeat(13000)})]) {
  const result=await handleContact(r,{env,fetcher:()=>assert.fail("Unexpected provider call")});
  assert.ok([400,403].includes(result.status));
 }
});
test("failed, replayed and wrong-host/action captcha results cannot send mail",async()=>{
 for(const result of [{success:false},{success:true,hostname:"evil.com",action:"contact"},{success:true,hostname:"vaxeron.com",action:"login"}]) {
  let calls=0;
  const response=await handleContact(request(),{env,fetcher:async()=>{calls++;return Response.json(result);}});
  assert.equal(response.status,400);assert.equal(calls,1);
 }
});
test("verified enquiry sends only to the fixed recipient with text content",async()=>{
 let calls=0;
 const response=await handleContact(request({...valid,to:"evil@example.com",from:"evil@example.com"}),{env,fetcher:async(url,options)=>{
  calls++;
  if(calls===1) return Response.json({success:true,hostname:"vaxeron.com",action:"contact"});
  assert.equal(url,"https://api.resend.com/emails");
  const sent=JSON.parse(options.body);assert.deepEqual(sent.to,["hello@vaxeron.com"]);assert.equal(sent.from,env.CONTACT_FROM_EMAIL);assert.equal(sent.reply_to,valid.email);assert.equal(sent.html,undefined);
  return Response.json({id:"test-receipt"});
 }});
 assert.equal(response.status,200);assert.equal(calls,2);
});
test("provider errors are not exposed and do not show false success",async()=>{
 for(const fail of ["reject","timeout"]){let calls=0;
  const response=await handleContact(request(),{env,fetcher:async()=>{
   if(++calls===1) return Response.json({success:true,hostname:"vaxeron.com",action:"contact"});
   if(fail==="timeout") throw new Error("PRIVATE_PROVIDER_SECRET");
   return Response.json({error:"PRIVATE_PROVIDER_SECRET"},{status:500});
  }});
  assert.ok([502,503].includes(response.status));assert.ok(!(await response.text()).includes("PRIVATE_PROVIDER_SECRET"));
 }
});
