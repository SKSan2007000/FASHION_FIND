import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const menDir = path.join(process.cwd(), 'public', 'style-models', 'men');
const womenDir = path.join(process.cwd(), 'public', 'style-models', 'women');

async function processModels() {
  // 1. Male Model from male-front.jpg
  const maleSrc = path.join(process.cwd(), 'public', 'style-model', 'male-front.jpg');
  const maleBuffer = fs.readFileSync(maleSrc);
  const maleMetadata = await sharp(maleBuffer).metadata();
  console.log('Male original dimensions:', maleMetadata.width, maleMetadata.height);

  // 30% top crop removes chin/beard completely, starting at neck/collar
  const maleTopCrop = Math.round(maleMetadata.height * 0.30);
  const maleCroppedHeight = maleMetadata.height - maleTopCrop;

  const croppedMaleBuffer = await sharp(maleBuffer)
    .extract({
      left: 0,
      top: maleTopCrop,
      width: maleMetadata.width,
      height: maleCroppedHeight
    })
    .jpeg({ quality: 92 })
    .toBuffer();

  fs.writeFileSync(path.join(menDir, 'male-body.jpg'), croppedMaleBuffer);
  fs.writeFileSync(path.join(menDir, 'male-faceless.jpg'), croppedMaleBuffer);
  console.log('Saved perfect faceless male model.');

  // 2. Female Model from female-model-suit.jpg
  const femaleSrc = path.join(womenDir, 'female-model-suit.jpg');
  const femaleBuffer = fs.readFileSync(femaleSrc);
  const femaleMetadata = await sharp(femaleBuffer).metadata();
  console.log('Female dimensions:', femaleMetadata.width, femaleMetadata.height);

  const femaleTopCrop = Math.round(femaleMetadata.height * 0.23);
  const femaleCroppedHeight = femaleMetadata.height - femaleTopCrop;

  const croppedFemaleBuffer = await sharp(femaleBuffer)
    .extract({
      left: 0,
      top: femaleTopCrop,
      width: femaleMetadata.width,
      height: femaleCroppedHeight
    })
    .jpeg({ quality: 92 })
    .toBuffer();

  fs.writeFileSync(path.join(womenDir, 'female-body.jpg'), croppedFemaleBuffer);
  fs.writeFileSync(path.join(womenDir, 'female-faceless.jpg'), croppedFemaleBuffer);
  console.log('Saved perfect faceless female model.');
}

processModels().catch(console.error);
