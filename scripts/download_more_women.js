import fs from 'fs';
import path from 'path';
import https from 'https';

const womenDir = path.join(process.cwd(), 'public', 'style-models', 'women');

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed with status ${res.statusCode} for ${url}`));
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(dest);
      });
    }).on('error', reject);
  });
}

async function main() {
  const candidates = [
    { name: 'female-model-suit.jpg', url: 'https://images.unsplash.com/photo-1584273143981-41c073dfe8f8?auto=format&fit=crop&w=1000&q=85' },
    { name: 'female-model-dress.jpg', url: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=1000&q=85' },
    { name: 'female-model-denim.jpg', url: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=1000&q=85' },
    { name: 'female-model-studio.jpg', url: 'https://images.unsplash.com/photo-1550614000-4895a10e1bfd?auto=format&fit=crop&w=1000&q=85' }
  ];

  for (const c of candidates) {
    try {
      const dest = path.join(womenDir, c.name);
      await downloadFile(c.url, dest);
      console.log(`Saved ${c.name} (${fs.statSync(dest).size} bytes)`);
    } catch (e) {
      console.error(e.message);
    }
  }
}
main();
