import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, createPublicKey, verify } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { discoverDongles, saveDongleToFolder, signDongleChallenge } from '../src/dongle.js';

function makePair() {
  const pair = generateKeyPairSync('ed25519');
  return {
    privateKeyPkcs8: pair.privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64'),
    publicKeySpki: pair.publicKey.export({ format: 'der', type: 'spki' }).toString('base64')
  };
}

async function writeDongle(filePath, username) {
  const pair = makePair();
  await writeFile(filePath, JSON.stringify({ username, privateKeyPkcs8: pair.privateKeyPkcs8 }));
  return pair;
}

test('menemukan beberapa file dongle JSON di root dan folder KryptoInfoDongle', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'kryptoinfo-usb-'));
  try {
    const folder = path.join(root, 'KryptoInfoDongle');
    await mkdir(folder);
    await writeDongle(path.join(folder, 'kryptoinfo-dongle-adhafa.json'), 'adhafa');
    await writeDongle(path.join(root, 'kryptoinfo-dongle-mirwan.json'), 'mirwan');
    await writeFile(path.join(folder, 'catatan.json'), JSON.stringify({ note: 'bukan dongle' }));

    const dongles = await discoverDongles({ roots: [root] });
    assert.equal(dongles.length, 2);
    assert.deepEqual(dongles.map(item => item.username).sort(), ['adhafa', 'mirwan']);
    assert.ok(dongles.every(item => item.id && item.fileName && item.fingerprint));
    assert.ok(dongles.every(item => !JSON.stringify(item).includes('privateKeyPkcs8')));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('signature dari dongle pilihan diverifikasi oleh public key yang tepat', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'kryptoinfo-usb-sign-'));
  try {
    const aPath = path.join(root, 'kryptoinfo-dongle-a.json');
    const bPath = path.join(root, 'kryptoinfo-dongle-b.json');
    const a = await writeDongle(aPath, 'a');
    await writeDongle(bPath, 'b');

    const list = await discoverDongles({ roots: [root] });
    const selected = list.find(item => item.username === 'a');
    const challenge = 'Q0hhbGxlbmdlX3Rlc3RfMTIzNDU2Nzg5';
    const signature = await signDongleChallenge(selected.filePath, challenge);
    const publicKey = createPublicKey({
      key: Buffer.from(a.publicKeySpki, 'base64'), format: 'der', type: 'spki'
    });

    assert.equal(
      verify(null, Buffer.from(challenge, 'utf8'), publicKey, Buffer.from(signature, 'base64url')),
      true
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('menolak challenge yang tidak sesuai format backend', async () => {
  await assert.rejects(
    () => signDongleChallenge('unused.json', 'bad'),
    /Challenge tidak valid/
  );
});

test('saveDongleToFolder membuat folder KryptoInfoDongle dan menyimpan file dongle valid', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'kryptoinfo-usb-save-'));
  try {
    const targetFolder = path.join(root, 'KryptoInfoDongle');
    const pair = makePair();
    const result = await saveDongleToFolder(targetFolder, 'testuser', pair.privateKeyPkcs8);

    assert.equal(result.fileName, 'kryptoinfo-dongle-testuser.json');
    assert.equal(result.filePath, path.join(targetFolder, 'kryptoinfo-dongle-testuser.json'));

    const discovered = await discoverDongles({ roots: [root] });
    assert.equal(discovered.length, 1);
    assert.equal(discovered[0].username, 'testuser');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
