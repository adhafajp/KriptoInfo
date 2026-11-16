import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Hash, Cpu, Sparkles, ArrowRightLeft, ShieldAlert } from 'lucide-react';

function md5(string) {
  function rotateLeft(lValue, iShiftBits) {
    return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
  }
  function addUnsigned(lX, lY) {
    const lX4 = lX & 0x40000000;
    const lY4 = lY & 0x40000000;
    const lX8 = lX & 0x80000000;
    const lY8 = lY & 0x80000000;
    const lResult = (lX & 0x3fffffff) + (lY & 0x3fffffff);
    if (lX4 & lY4) return lResult ^ 0x80000000 ^ lX8 ^ lY8;
    if (lX4 | lY4) {
      if (lResult & 0x40000000) return lResult ^ 0xc0000000 ^ lX8 ^ lY8;
      return lResult ^ 0x40000000 ^ lX8 ^ lY8;
    }
    return lResult ^ lX8 ^ lY8;
  }
  function F(x, y, z) { return (x & y) | ((~x) & z); }
  function G(x, y, z) { return (x & z) | (y & (~z)); }
  function H(x, y, z) { return x ^ y ^ z; }
  function I(x, y, z) { return y ^ (x | (~z)); }
  function FF(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function GG(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function HH(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function II(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function convertToWordArray(str) {
    let lWordCount;
    const lMessageLength = str.length;
    const lNumberOfWords_temp1 = lMessageLength + 8;
    const lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
    const lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
    const lWordArray = Array(lNumberOfWords - 1);
    for (let i = 0; i < lNumberOfWords; i++) lWordArray[i] = 0;
    let lBytePosition = 0;
    let lByteCount = 0;
    while (lByteCount < lMessageLength) {
      lWordCount = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordCount] = (lWordArray[lWordCount] | (str.charCodeAt(lByteCount) << lBytePosition));
      lByteCount++;
    }
    lWordCount = (lByteCount - (lByteCount % 4)) / 4;
    lBytePosition = (lByteCount % 4) * 8;
    lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
    lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
    lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
    return lWordArray;
  }
  function wordToHex(lValue) {
    let WordToHexValue = '', WordToHexValue_temp = '', lByte, lCount;
    for (lCount = 0; lCount <= 3; lCount++) {
      lByte = (lValue >>> (lCount * 8)) & 255;
      WordToHexValue_temp = '0' + lByte.toString(16);
      WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length - 2, 2);
    }
    return WordToHexValue;
  }
  const x = convertToWordArray(string);
  let a = 0x67452301, b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476;
  const S11 = 7, S12 = 12, S13 = 17, S14 = 22;
  const S21 = 5, S22 = 9, S23 = 14, S24 = 20;
  const S31 = 4, S32 = 11, S33 = 16, S34 = 23;
  const S41 = 6, S42 = 10, S43 = 15, S44 = 21;
  for (let k = 0; k < x.length; k += 16) {
    const AA = a, BB = b, CC = c, DD = d;
    a = FF(a, b, c, d, x[k + 0], S11, 0xd76aa478);
    d = FF(d, a, b, c, x[k + 1], S12, 0xe8c7b756);
    c = FF(c, d, a, b, x[k + 2], S13, 0x242070db);
    b = FF(b, c, d, a, x[k + 3], S14, 0xc1bdceee);
    a = FF(a, b, c, d, x[k + 4], S11, 0xf57c0faf);
    d = FF(d, a, b, c, x[k + 5], S12, 0x4787c62a);
    c = FF(c, d, a, b, x[k + 6], S13, 0xa8304613);
    b = FF(b, c, d, a, x[k + 7], S14, 0xfd469501);
    a = FF(a, b, c, d, x[k + 8], S11, 0x698098d8);
    d = FF(d, a, b, c, x[k + 9], S12, 0x8b44f7af);
    c = FF(c, d, a, b, x[k + 10], S13, 0xffff5bb1);
    b = FF(b, c, d, a, x[k + 11], S14, 0x895cd7be);
    a = FF(a, b, c, d, x[k + 12], S11, 0x6b901122);
    d = FF(d, a, b, c, x[k + 13], S12, 0xfd987193);
    c = FF(c, d, a, b, x[k + 14], S13, 0xa679438e);
    b = FF(b, c, d, a, x[k + 15], S14, 0x49b40821);
    a = GG(a, b, c, d, x[k + 1], S21, 0xf61e2562);
    d = GG(d, a, b, c, x[k + 6], S22, 0xc040b340);
    c = GG(c, d, a, b, x[k + 11], S23, 0x265e5a51);
    b = GG(b, c, d, a, x[k + 0], S24, 0xe9b6c7aa);
    a = GG(a, b, c, d, x[k + 5], S21, 0xd62f105d);
    d = GG(d, a, b, c, x[k + 10], S22, 0x02441453);
    c = GG(c, d, a, b, x[k + 15], S23, 0xd8a1e681);
    b = GG(b, c, d, a, x[k + 4], S24, 0xe7d3fbc8);
    a = GG(a, b, c, d, x[k + 9], S21, 0x21e1cde6);
    d = GG(d, a, b, c, x[k + 14], S22, 0xc33707d6);
    c = GG(c, d, a, b, x[k + 3], S23, 0xf4d50d87);
    b = GG(b, c, d, a, x[k + 8], S24, 0x455a14ed);
    a = GG(a, b, c, d, x[k + 13], S21, 0xa9e3e905);
    d = GG(d, a, b, c, x[k + 2], S22, 0xfcefa3f8);
    c = GG(c, d, a, b, x[k + 7], S23, 0x676f02d9);
    b = GG(b, c, d, a, x[k + 12], S24, 0x8d2a4c8a);
    a = HH(a, b, c, d, x[k + 5], S31, 0xfffa3942);
    d = HH(d, a, b, c, x[k + 8], S32, 0x8771f681);
    c = HH(c, d, a, b, x[k + 11], S33, 0x6d9d6122);
    b = HH(b, c, d, a, x[k + 14], S34, 0xfde5380c);
    a = HH(a, b, c, d, x[k + 1], S31, 0xa4beea44);
    d = HH(d, a, b, c, x[k + 4], S32, 0x4bdecfa9);
    c = HH(c, d, a, b, x[k + 7], S33, 0xf6bb4b60);
    b = HH(b, c, d, a, x[k + 10], S34, 0xbebfbc70);
    a = HH(a, b, c, d, x[k + 13], S31, 0x289b7ec6);
    d = HH(d, a, b, c, x[k + 0], S32, 0xeaa127fa);
    c = HH(c, d, a, b, x[k + 3], S33, 0xd4ef3085);
    b = HH(b, c, d, a, x[k + 6], S34, 0x04881d05);
    a = HH(a, b, c, d, x[k + 9], S31, 0xd9d4d039);
    d = HH(d, a, b, c, x[k + 12], S32, 0xe6db99e5);
    c = HH(c, d, a, b, x[k + 15], S33, 0x1fa27cf8);
    b = HH(b, c, d, a, x[k + 2], S34, 0xc4ac5665);
    a = II(a, b, c, d, x[k + 0], S41, 0xf4292244);
    d = II(d, a, b, c, x[k + 7], S42, 0x432aff97);
    c = II(c, d, a, b, x[k + 14], S43, 0xab9423a7);
    b = II(b, c, d, a, x[k + 5], S44, 0xfc93a039);
    a = II(a, b, c, d, x[k + 12], S41, 0x655b59c3);
    d = II(d, a, b, c, x[k + 3], S42, 0x8f0ccc92);
    c = II(c, d, a, b, x[k + 10], S43, 0xffeff47d);
    b = II(b, c, d, a, x[k + 1], S44, 0x85845dd1);
    a = II(a, b, c, d, x[k + 8], S41, 0x6fa87e4f);
    d = II(d, a, b, c, x[k + 15], S42, 0xfe2ce6e0);
    c = II(c, d, a, b, x[k + 6], S43, 0xa3014314);
    b = II(b, c, d, a, x[k + 13], S44, 0x4e0811a1);
    a = II(a, b, c, d, x[k + 4], S41, 0xf7537e82);
    d = II(d, a, b, c, x[k + 11], S42, 0xbd3af235);
    c = II(c, d, a, b, x[k + 2], S43, 0x2ad7d2bb);
    b = II(b, c, d, a, x[k + 9], S44, 0xeb86d391);
    a = addUnsigned(a, AA);
    b = addUnsigned(b, BB);
    c = addUnsigned(c, CC);
    d = addUnsigned(d, DD);
  }
  return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
}

async function digestSubtle(algo, text) {
  const enc = new TextEncoder();
  const buffer = await crypto.subtle.digest(algo, enc.encode(text));
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export default function CryptoToolModal({ isOpen, onClose }) {
  const [activeSubTab, setActiveSubTab] = useState('hasher');
  const [inputText, setInputText] = useState('KryptoInfo Secure Digital Vault 2026');
  const [copiedKey, setCopiedKey] = useState(null);

  const [hashes, setHashes] = useState({
    md5: '',
    sha1: '',
    sha256: '',
    sha512: '',
  });

  const [avalanchePercent, setAvalanchePercent] = useState(0);

  // Converter state
  const [convInput, setConvInput] = useState('Hello KryptoInfo!');
  const [convBase64, setConvBase64] = useState('');
  const [convHex, setConvHex] = useState('');
  const [convBinary, setConvBinary] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    let isCurrent = true;
    async function calculate() {
      try {
        const md5Res = md5(inputText);
        const [sha1Res, sha256Res, sha512Res] = await Promise.all([
          digestSubtle('SHA-1', inputText),
          digestSubtle('SHA-256', inputText),
          digestSubtle('SHA-512', inputText),
        ]);

        if (isCurrent) {
          setHashes({
            md5: md5Res,
            sha1: sha1Res,
            sha256: sha256Res,
            sha512: sha512Res,
          });

          if (inputText.length > 0) {
            const flippedFirstChar = String.fromCharCode(inputText.charCodeAt(0) ^ 1);
            const flippedInput = flippedFirstChar + inputText.slice(1);
            const flippedSha256 = await digestSubtle('SHA-256', flippedInput);

            let bitDiff = 0;
            for (let i = 0; i < sha256Res.length; i += 2) {
              const b1 = parseInt(sha256Res.substr(i, 2), 16);
              const b2 = parseInt(flippedSha256.substr(i, 2), 16);
              let xor = b1 ^ b2;
              while (xor > 0) {
                if (xor & 1) bitDiff++;
                xor >>= 1;
              }
            }
            setAvalanchePercent(((bitDiff / 256) * 100).toFixed(1));
          } else {
            setAvalanchePercent(0);
          }
        }
      } catch (err) {
        console.error('Hasher error:', err);
      }
    }

    calculate();
    return () => {
      isCurrent = false;
    };
  }, [inputText, isOpen]);

  useEffect(() => {
    try {
      const utf8Bytes = new TextEncoder().encode(convInput);
      let binStr = '';
      utf8Bytes.forEach((b) => (binStr += String.fromCharCode(b)));
      setConvBase64(btoa(binStr));

      const hexStr = Array.from(utf8Bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(' ');
      setConvHex(hexStr);

      const binDisplay = Array.from(utf8Bytes)
        .slice(0, 8)
        .map((b) => b.toString(2).padStart(8, '0'))
        .join(' ');
      setConvBinary(binDisplay + (utf8Bytes.length > 8 ? ' ...' : ''));
    } catch {
      setConvBase64('Error encoding');
      setConvHex('Error encoding');
      setConvBinary('Error encoding');
    }
  }, [convInput]);

  function copyToClipboard(key, text) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-3xl dossier-paper rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 dossier-panel border-b border-stone-400/50 dark:border-stone-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded dossier-surface text-red-700 dark:text-amber-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-serif font-black text-stone-900 dark:text-amber-100 flex items-center gap-2">
                <span>Cryptographic Lab &amp; Hasher</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-800 text-amber-50 font-bold">
                  REALTIME TOOL
                </span>
              </h3>
              <p className="text-xs font-mono text-stone-700 dark:text-stone-300">
                Inspeksi hash multi-algoritma, evaluasi avalanche effect, dan konversi data kripto.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-stone-700 dark:text-stone-300 hover:bg-stone-300/60 dark:hover:bg-stone-800 transition-colors"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-tab selection */}
        <div className="flex border-b border-stone-400/50 dark:border-stone-700 dossier-panel px-6 pt-2 gap-2">
          <button
            onClick={() => setActiveSubTab('hasher')}
            className={`px-4 py-2 text-xs font-mono font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeSubTab === 'hasher'
                ? 'border-red-700 dark:border-amber-400 text-red-800 dark:text-amber-300'
                : 'border-transparent text-stone-700 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white'
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
            <span>Multi-Hash &amp; Avalanche Inspector</span>
          </button>
          <button
            onClick={() => setActiveSubTab('converter')}
            className={`px-4 py-2 text-xs font-mono font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeSubTab === 'converter'
                ? 'border-red-700 dark:border-amber-400 text-red-800 dark:text-amber-300'
                : 'border-transparent text-stone-700 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Hex, Base64 &amp; Binary Converter</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {activeSubTab === 'hasher' ? (
            <>
              <div>
                <label className="text-xs font-mono font-bold text-stone-900 dark:text-amber-200 mb-1.5 flex items-center justify-between">
                  <span>Input String / Preimage</span>
                  <span className="text-[10px] text-stone-700 dark:text-stone-300">
                    {inputText.length} karakter ({new TextEncoder().encode(inputText).length} bytes)
                  </span>
                </label>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  rows={2}
                  className="w-full dossier-input rounded px-3.5 py-2.5 text-xs font-mono"
                  placeholder="Ketik teks apa saja untuk menghitung hash serentak..."
                />
              </div>

              {/* Avalanche Gauge */}
              <div className="p-3.5 rounded dossier-panel flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-red-700 dark:text-amber-400 flex-shrink-0" />
                  <div className="text-xs font-mono">
                    <span className="font-bold text-stone-900 dark:text-amber-100">Avalanche Effect Score (SHA-256):</span>
                    <span className="text-stone-800 dark:text-stone-200 ml-1.5">
                      Perubahan 1 bit input membalik{' '}
                      <span className="text-emerald-800 dark:text-emerald-400 font-black">{avalanchePercent}%</span> bit output hash
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded dossier-surface text-stone-900 dark:text-amber-300">
                  Ideal: ~50%
                </span>
              </div>

              {/* Hashes Grid */}
              <div className="space-y-3">
                {/* MD5 */}
                <div className="p-3 rounded dossier-panel">
                  <div className="flex items-center justify-between mb-1.5 gap-2">
                    <div className="flex items-center gap-2 flex-wrap font-mono">
                      <span className="text-xs font-black text-red-800 dark:text-red-400">MD5</span>
                      <span className="text-[10px] text-stone-700 dark:text-stone-300 font-bold">128-bit (Legacy / Broken)</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-900/15 dark:bg-red-950/60 text-red-900 dark:text-red-300 border border-red-700/40 flex items-center gap-1 font-bold">
                        <ShieldAlert className="w-2.5 h-2.5" /> Collision Vulnerable
                      </span>
                    </div>
                    <button
                      onClick={() => copyToClipboard('md5', hashes.md5)}
                      className="text-stone-700 dark:text-stone-300 hover:text-red-800 dark:hover:text-amber-300 transition-colors p-1"
                    >
                      {copiedKey === 'md5' ? <Check className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="font-mono text-[11px] font-bold break-all select-all dossier-input p-2 rounded">
                    {hashes.md5 || '...'}
                  </div>
                </div>

                {/* SHA-1 */}
                <div className="p-3 rounded dossier-panel">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-xs font-black text-amber-800 dark:text-amber-400">SHA-1</span>
                      <span className="text-[10px] text-stone-700 dark:text-stone-300 font-bold">160-bit (Deprecated)</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard('sha1', hashes.sha1)}
                      className="text-stone-700 dark:text-stone-300 hover:text-red-800 dark:hover:text-amber-300 transition-colors p-1"
                    >
                      {copiedKey === 'sha1' ? <Check className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="font-mono text-[11px] font-bold break-all select-all dossier-input p-2 rounded">
                    {hashes.sha1 || '...'}
                  </div>
                </div>

                {/* SHA-256 */}
                <div className="p-3 rounded dossier-panel border-2 border-emerald-700/60 dark:border-emerald-500/60">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-xs font-black text-emerald-800 dark:text-emerald-400">SHA-256</span>
                      <span className="text-[10px] text-emerald-900 dark:text-emerald-300 font-bold">
                        256-bit (Standard KryptoInfo Ledger)
                      </span>
                    </div>
                    <button
                      onClick={() => copyToClipboard('sha256', hashes.sha256)}
                      className="text-stone-700 dark:text-stone-300 hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors p-1"
                    >
                      {copiedKey === 'sha256' ? <Check className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="font-mono text-[11px] font-bold break-all select-all dossier-input p-2 rounded">
                    {hashes.sha256 || '...'}
                  </div>
                </div>

                {/* SHA-512 */}
                <div className="p-3 rounded dossier-panel">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-xs font-black text-stone-900 dark:text-amber-200">SHA-512</span>
                      <span className="text-[10px] text-stone-700 dark:text-stone-300 font-bold">
                        512-bit (High-Entropy Digest)
                      </span>
                    </div>
                    <button
                      onClick={() => copyToClipboard('sha512', hashes.sha512)}
                      className="text-stone-700 dark:text-stone-300 hover:text-red-800 dark:hover:text-amber-300 transition-colors p-1"
                    >
                      {copiedKey === 'sha512' ? <Check className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="font-mono text-[10px] font-bold break-all select-all dossier-input p-2 rounded max-h-20 overflow-y-auto">
                    {hashes.sha512 || '...'}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold text-stone-900 dark:text-amber-200 mb-1.5">
                  Input Text (UTF-8)
                </label>
                <input
                  type="text"
                  value={convInput}
                  onChange={(e) => setConvInput(e.target.value)}
                  className="w-full dossier-input rounded px-3.5 py-2.5 text-xs font-mono font-bold"
                />
              </div>

              <div className="p-3 rounded dossier-panel">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono font-bold text-stone-900 dark:text-amber-200">Base64 Representation</span>
                  <button
                    onClick={() => copyToClipboard('b64', convBase64)}
                    className="text-stone-700 dark:text-stone-300 hover:text-red-800 dark:hover:text-amber-300 p-1"
                  >
                    {copiedKey === 'b64' ? <Check className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="font-mono text-xs font-bold break-all select-all dossier-input p-2 rounded">
                  {convBase64}
                </div>
              </div>

              <div className="p-3 rounded dossier-panel">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono font-bold text-stone-900 dark:text-amber-200">Hexadecimal Bytes</span>
                  <button
                    onClick={() => copyToClipboard('hex', convHex)}
                    className="text-stone-700 dark:text-stone-300 hover:text-red-800 dark:hover:text-amber-300 p-1"
                  >
                    {copiedKey === 'hex' ? <Check className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="font-mono text-xs font-bold break-all select-all dossier-input p-2 rounded">
                  {convHex}
                </div>
              </div>

              <div className="p-3 rounded dossier-panel">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono font-bold text-stone-900 dark:text-amber-200">Binary (First 8 Bytes)</span>
                  <button
                    onClick={() => copyToClipboard('bin', convBinary)}
                    className="text-stone-700 dark:text-stone-300 hover:text-red-800 dark:hover:text-amber-300 p-1"
                  >
                    {copiedKey === 'bin' ? <Check className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="font-mono text-xs font-bold break-all select-all dossier-input p-2 rounded">
                  {convBinary}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 dossier-panel border-t border-stone-400/50 dark:border-stone-700 text-[11px] font-mono text-stone-800 dark:text-stone-200 flex justify-between items-center">
          <span className="font-bold">Pikatan Cryptographic Engine Suite</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1 bg-red-800 hover:bg-red-900 text-amber-50 rounded text-xs font-bold transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
