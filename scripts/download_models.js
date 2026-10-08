import fs from 'fs';
import path from 'path';
import https from 'https';

const menDir = path.join(process.cwd(), 'public', 'style-models', 'men');
const womenDir = path.join(process.cwd(), 'public', 'style-models', 'women');

fs.mkdirSync(menDir, { recursive: true });
fs.mkdirSync(womenDir, { recursive: true });

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
  const menImages = [
    {
      name: 'male-body.jpg',
      url: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=1000&q=85'
    },
    {
      name: 'male-body-formal.jpg',
      url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1000&q=85'
    },
    {
      name: 'male-body-smart.jpg',
      url: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=1000&q=85'
    }
  ];

  const womenImages = [
    {
      name: 'female-body.jpg',
      url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=85'
    },
    {
      name: 'female-body-smart.jpg',
      url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1000&q=85'
    },
    {
      name: 'female-body-casual.jpg',
      url: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1000&q=85'
    }
  ];

  console.log('Downloading Men models...');
  for (const img of menImages) {
    try {
      const dest = path.join(menDir, img.name);
      await downloadFile(img.url, dest);
      console.log(`Saved ${img.name} (${fs.statSync(dest).size} bytes)`);
    } catch (err) {
      console.error(`Error downloading ${img.name}:`, err.message);
    }
  }

  console.log('Downloading Women models...');
  for (const img of womenImages) {
    try {
      const dest = path.join(womenDir, img.name);
      await downloadFile(img.url, dest);
      console.log(`Saved ${img.name} (${fs.statSync(dest).size} bytes)`);
    } catch (err) {
      console.error(`Error downloading ${img.name}:`, err.message);
    }
  }
}

main();
