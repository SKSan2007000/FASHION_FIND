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
    { name: 'female-studio-1.jpg', url: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1000&q=85' },
    { name: 'female-studio-2.jpg', url: 'https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?auto=format&fit=crop&w=1000&q=85' },
    { name: 'female-studio-3.jpg', url: 'https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?auto=format&fit=crop&w=1000&q=85' },
    { name: 'female-studio-4.jpg', url: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1000&q=85' }
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
