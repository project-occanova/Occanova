import {test} from 'node:test';
import assert from 'node:assert/strict';
import {z} from 'zod';
import {validationFeedback} from '../src/lib/form-feedback';
import {draftProfileSchema,profileSchema} from '../src/lib/validation';

test('server validation describes the field rather than a raw schema error',()=>{
 const result=z.object({password:z.string().min(10)}).safeParse({password:'short'});assert(!result.success);assert.equal(validationFeedback(result.error.issues[0]),'Password: use at least 10 characters.');
 const missing=z.object({email:z.string().email()}).safeParse({});assert(!missing.success);assert.equal(validationFeedback(missing.error.issues[0]),'Email address: please complete this field.');
 const email=z.object({email:z.string().email()}).safeParse({email:'bad'});assert(!email.success);assert.equal(validationFeedback(email.error.issues[0]),'Email address: enter a valid email address.');
});
test('unfinished drafts can be saved but cannot be submitted as complete profiles',()=>{
 const draft=draftProfileSchema.parse({name:'A',summary:'typing',phone:'98',experience:0,price:0});assert.equal(draft.category,'');assert.equal(draft.description,'');assert.deepEqual(draft.locations,[]);assert(!profileSchema.safeParse(draft).success);
 assert(!draftProfileSchema.safeParse({...draft,description:'x'.repeat(3001)}).success);assert(!draftProfileSchema.safeParse({...draft,gallery:Array(101).fill('/api/media')}).success);
});
