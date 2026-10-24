import { test } from 'node:test';
import assert from 'node:assert/strict';
import { S3Client } from '@aws-sdk/client-s3';
import { storageConfig, memoryObjectKey, uploadMemoryObject, deleteMemoryObject, memoryDownloadUrl, checkObjectStorage } from '../src/lib/object-storage.ts';

// SDK transport is stubbed; no provider request or real credential is used.
test('S3 configuration, folders, image verification and private download links', async () => {
  const names = ['S3_ENDPOINT','S3_REGION','S3_BUCKET','S3_ACCESS_KEY_ID','S3_SECRET_ACCESS_KEY','S3_FORCE_PATH_STYLE'];
  const old = Object.fromEntries(names.map(k=>[k,process.env[k]]));
  const original = S3Client.prototype.send;
  const calls=[];let size=0;let corrupt=false;
  try {
    for(const k of names)delete process.env[k];
    assert.throws(()=>storageConfig(),{name:'Error'});
    Object.assign(process.env,{S3_ENDPOINT:'https://storage.example.com',S3_REGION:'kencana',S3_BUCKET:'test-bucket',S3_ACCESS_KEY_ID:'test-key',S3_SECRET_ACCESS_KEY:'test-secret'});
    assert.equal(storageConfig().forcePathStyle,false);
    process.env.S3_FORCE_PATH_STYLE='true';assert.equal(storageConfig().forcePathStyle,true);
    process.env.S3_FORCE_PATH_STYLE='typo';assert.throws(()=>storageConfig());process.env.S3_FORCE_PATH_STYLE='true';
    process.env.S3_ENDPOINT='https://storage.example.com/bucket';assert.throws(()=>storageConfig());process.env.S3_ENDPOINT='https://storage.example.com';
    const key=memoryObjectKey('Budi Santoso / Keluarga','guest-1','upload-1');
    assert.match(key,/^wedding-photo\/budi-santoso-keluarga--guest-1\/upload-1-[a-f0-9-]+\.jpg$/);
    assert.notEqual(key,memoryObjectKey('Budi Santoso / Keluarga','guest-2','upload-1'));
    assert.throws(()=>memoryObjectKey('Budi','../escape','upload-1'));
    S3Client.prototype.send=async function(command){
      calls.push(command);
      if(command.constructor.name==='PutObjectCommand'){size=command.input.Body.length;return {};}
      if(command.constructor.name==='HeadObjectCommand')return {ContentLength:corrupt?size+1:size};
      return {};
    };
    await checkObjectStorage();
    await uploadMemoryObject(key,Buffer.from('test-photo'));
    const put=calls.find(c=>c.constructor.name==='PutObjectCommand');assert.equal(put.input.Key,key);assert.equal(put.input.ContentType,'image/jpeg');assert.equal(put.input.ACL,undefined);
    corrupt=true;await assert.rejects(()=>uploadMemoryObject(key,Buffer.from('test-photo')));corrupt=false;
    const url=new URL(await memoryDownloadUrl(key));
    assert.equal(url.hostname,'storage.example.com');assert.equal(url.pathname,'/test-bucket/'+key);
    assert.equal(url.searchParams.get('X-Amz-Expires'),'300');assert(url.searchParams.get('X-Amz-Signature'));
    process.env.S3_FORCE_PATH_STYLE='false';assert.equal(new URL(await memoryDownloadUrl(key)).hostname,'test-bucket.storage.example.com');
    await deleteMemoryObject(key);assert.equal(calls.at(-1).constructor.name,'DeleteObjectCommand');
    await assert.rejects(()=>uploadMemoryObject('../bad.jpg',Buffer.from('x')));
    await assert.rejects(()=>uploadMemoryObject(key,Buffer.alloc(1048577)));
  } finally {S3Client.prototype.send=original;for(const k of names){if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];}}
});
