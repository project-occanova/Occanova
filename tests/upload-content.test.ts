import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateUploadContent} from '../src/lib/storage';
test('uploads reject mismatched file types and obvious non-image content before storage',()=>{
 const png=Buffer.from('89504e470d0a1a0a','hex');
 assert.doesNotThrow(()=>validateUploadContent('image/png',png));
 assert.doesNotThrow(()=>validateUploadContent('image/jpeg',Buffer.from('ffd8ff','hex')));
 assert.doesNotThrow(()=>validateUploadContent('image/webp',Buffer.from('RIFF0000WEBP')));
 assert.doesNotThrow(()=>validateUploadContent('application/pdf',Buffer.from('%PDF-1.7')));
 assert.throws(()=>validateUploadContent('image/jpeg',png),/contents match/);
 for(const type of ['image/jpeg','image/png','image/webp','application/pdf','text/html'])assert.throws(()=>validateUploadContent(type,Buffer.from('<html>not a valid file</html>')),/contents match/);
 assert.throws(()=>validateUploadContent('image/png',new Uint8Array()),/contents match/);
});
