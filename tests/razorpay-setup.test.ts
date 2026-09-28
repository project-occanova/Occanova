import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {basename,dirname,join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

test('Razorpay setup refuses live credentials before contacting the gateway',()=>{
 const fixture=mkdtempSync(join(tmpdir(),'occanova-billing-'));
 try{
  writeFileSync(join(fixture,'.env.local'),'RAZORPAY_KEY_ID=rzp_live_example\nRAZORPAY_KEY_SECRET=fixture-secret\n');
  const result=spawnSync(process.execPath,[resolve('node_modules/tsx/dist/cli.mjs'),resolve('scripts/razorpay-setup.ts'),'--create'],{cwd:fixture,encoding:'utf8',timeout:15000});
  assert.equal(result.status,1);
  assert.match(result.stderr,/Live keys are refused/);
  assert.equal(result.stdout.includes('Connected'),false);
  assert.equal(result.stderr.includes('fixture-secret'),false);
 }finally{if(dirname(resolve(fixture))!==resolve(tmpdir())||!basename(fixture).startsWith('occanova-billing-'))throw Error('Unexpected fixture path.');rmSync(fixture,{recursive:true,force:true});}
});


test('Live setup reads a separate file and refuses Test keys before contacting the gateway',()=>{
 const fixture=mkdtempSync(join(tmpdir(),'occanova-billing-'));
 try{
  writeFileSync(join(fixture,'.env.razorpay-live.local'),'RAZORPAY_KEY_ID=rzp_test_example\nRAZORPAY_KEY_SECRET=fixture-secret\n');
  writeFileSync(join(fixture,'.env.local'),'RAZORPAY_KEY_ID=rzp_live_other\nRAZORPAY_KEY_SECRET=other-secret\n');
  const result=spawnSync(process.execPath,[resolve('node_modules/tsx/dist/cli.mjs'),resolve('scripts/razorpay-setup.ts'),'--live','--create'],{cwd:fixture,encoding:'utf8',timeout:15000});
  assert.equal(result.status,1);assert.match(result.stderr,/Test keys are refused in Live setup/);assert.equal(result.stdout.includes('Connected'),false);assert.equal(result.stderr.includes('fixture-secret'),false);assert.equal(result.stderr.includes('other-secret'),false);
 }finally{if(dirname(resolve(fixture))!==resolve(tmpdir())||!basename(fixture).startsWith('occanova-billing-'))throw Error('Unexpected fixture path.');rmSync(fixture,{recursive:true,force:true});}
});
