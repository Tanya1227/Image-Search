const express = require('express');
const cors = require('cors');
const { getJson } = require('serpapi');
const axios = require('axios');
const fs = require('fs-extra');
const archiver = require('archiver');
const path = require('path');

const app = express();
const port = 3002;

const IMAGE_DIR = 'C:\\Users\\Tanya\\Downloads\\Internship work\\House_Images\\House_Images\\Exterior';

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.get('/images', async (req, res) => {
  const { imageurl } = req.query;

  if (!imageurl) {
    return res.status(400).json({ error: 'Image URL is required.' });
  }

  try {
    // Use getJson function to fetch data from SERP API
    getJson(
      {
        engine: 'google_lens',
        url: imageurl,
        api_key: 'a5f42660d1601339e5c830c64046b53ebb21114c105046054eca27f1215870b1',
      },
      async (json) => {
        if (!json || !json.visual_matches) {
          return res.status(404).json({ error: 'No visual matches found.' });
        }

        const imageUrls = json.visual_matches.map(match => ({
          url: match.thumbnail,
          title: path.basename(match.title)
        }));

        // Download each image asynchronously
        const downloadPromises = imageUrls.map(async imageUrl => {
          const filename = imageUrl.title;
          const url = imageUrl.url;
          await downloadImage(url, filename);
        });

        // Wait for all downloads to complete
        await Promise.all(downloadPromises);

        // Create a ZIP archive of the downloaded images
        const zipFileName = 'downloaded_images.zip';
        const zipFilePath = path.join(IMAGE_DIR, zipFileName);
        await zipDirectory(IMAGE_DIR, zipFilePath);

        // Send the ZIP file as a response
        res.download(zipFilePath, zipFileName, (err) => {
          if (err) {
            console.error('Error sending ZIP file:', err);
            res.status(500).json({ error: 'Failed to send ZIP file.' });
          } else {
            console.log('ZIP file sent successfully.');
          }
        });
      }
    );
  } catch (error) {
    console.error('Error fetching data from SERP API:', error);
    res.status(500).json({ error: 'Error fetching data from SERP API.' });
  }
});
const sanitizeFilename = (filename) => {
    // Replace invalid characters with an underscore
    const sanitized = filename
    .replace(/[\\/:\"*?<># ,\-...|]/g, '_')
    .replace(/ /g, '_');
    console.log(sanitized);
    return sanitized;
  };

const downloadImage = async (url, filename) => {
  try {
    const sanitizedFilename = sanitizeFilename(filename);
    const filePath = path.join(IMAGE_DIR, `${sanitizedFilename}.jpg`);
    const response = await axios({
      url,
      responseType: 'stream'
    });

    return new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(filePath);
      writer.on('error' , reject);
      response.data.pipe(writer);
      response.data.on('end' , resolve);
     
    });
  } catch (error) {
    throw new Error(`Error downloading image from ${url}: ${error.message}`);
  }
};

const zipDirectory = async (source, out) => {
  const archive = archiver('zip', { zlib: { level: 9 } });
  const stream = fs.createWriteStream(out);

  return new Promise((resolve, reject) => {
    archive
      .directory(source, false)
      .on('error', err => reject(err))
      .pipe(stream);

    stream.on('close', () => {
      console.log(`ZIP archive created at ${out}`);
      resolve();
    });

    archive.finalize();
  });
};

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});