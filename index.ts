import Parser from 'rss-parser';
import * as fs from 'fs';
import { join } from 'path';
import * as https from 'https';
import { promisify } from 'util';

// Example markdown file with front matter
// ---
// title: "aaa"
// date: 2024-02-11
// draft: false
// externalUrl = "https://example.com/"
// description: "a description"
// tags: ["example", "tag"]
// ---
//  an example to get you started
// # This is a heading
// ## This is a subheading
// ### This is a subsubheading
// #### This is a subsubsubheading
// This is a paragraph with **bold** and *italic* text.
// Check more at [Blowfish documentation](https://blowfish.page/)
// undefined

// File should be saved in ./content/episodes/${unixTimeStamp}-{cleanEpisodeName}/index.md
// Image should be saved in ./content/episodes/${unixTimeStamp}-{cleanEpisodeName}/featured.jpg

// Example JSON of item from RSS feed
// {
//   "creator": "Aakash Kapur and Amrit Sami",
//   "title": "WtP: How to handle duplicative and repetitive work in legal teams",
//   "link": "https://podcasters.spotify.com/pod/show/whatstheproblem/episodes/WtP-How-to-handle-duplicative-and-repetitive-work-in-legal-teams-e2eq1o3",
//   "pubDate": "Tue, 23 Jan 2024 07:00:00 GMT",
//   "enclosure": {
//     "url": "https://anchor.fm/s/1b620d70/podcast/play/81642691/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F2024-0-22%2Fbdaec9b2-ab95-9829-8a42-b6b13b2dadc8.m4a",
//     "length": "34267861",
//     "type": "audio/x-m4a"
//   },
//   "dc:creator": "Aakash Kapur and Amrit Sami",
//   "content": "<p>Amrit speaks with Samuel Smolkin, CEO and founder of Office and Dragons. Office and Dragons automates repetitive work for legal teams. Sam and Amrit talk all things LegalTech, enterprise sales and expansion.</p>\n<p>Keep up to date with Office and Dragons here:</p>\n<p>https://www.officeanddragons.com/</p>\n<p>LinkedIn: <a href=\"https://www.linkedin.com/company/officeanddragons/\">https://www.linkedin.com/company/officeanddragons/</a></p>\n<p><br><strong>Twitter: </strong><a href=\"https://twitter.com/officendragons\">@officendragons</a></p>\n",
//   "contentSnippet": "Amrit speaks with Samuel Smolkin, CEO and founder of Office and Dragons. Office and Dragons automates repetitive work for legal teams. Sam and Amrit talk all things LegalTech, enterprise sales and expansion.\nKeep up to date with Office and Dragons here:\nhttps://www.officeanddragons.com/\nLinkedIn: https://www.linkedin.com/company/officeanddragons/\nTwitter: @officendragons",
//   "guid": "4953b3f5-1ca6-4e73-9f31-70f1445421db",
//   "isoDate": "2024-01-23T07:00:00.000Z",
//   "itunes": {
//     "summary": "<p>Amrit speaks with Samuel Smolkin, CEO and founder of Office and Dragons. Office and Dragons automates repetitive work for legal teams. Sam and Amrit talk all things LegalTech, enterprise sales and expansion.</p>\n<p>Keep up to date with Office and Dragons here:</p>\n<p>https://www.officeanddragons.com/</p>\n<p>LinkedIn: <a href=\"https://www.linkedin.com/company/officeanddragons/\">https://www.linkedin.com/company/officeanddragons/</a></p>\n<p><br><strong>Twitter: </strong><a href=\"https://twitter.com/officendragons\">@officendragons</a></p>\n",
//     "explicit": "No",
//     "duration": "00:23:34",
//     "image": "https://d3t3ozftmdmh3i.cloudfront.net/production/podcast_uploaded_nologo/4494108/4494108-1684672995888-70e1525da5e5f.jpg",
//     "episode": "10",
//     "season": "2",
//     "episodeType": "full"
//   }
// },

const downloadFile = async (url: string, dest: string): Promise<void> => {
  const file = fs.createWriteStream(dest);
  const request = https.get(url, function (response) {
    response.pipe(file);
  });
  return new Promise((resolve, reject) => {
    file.on('finish', () => {
      file.close();
      resolve();
    });
    file.on('error', (err) => {
      fs.unlink(dest, () => {
        reject(err);
      });
    });
  });
};

(async () => {
  const parser = new Parser();
  const feed = await parser.parseURL('https://anchor.fm/s/1b620d70/podcast/rss');

  feed.items.forEach(async (item) => {
    const { title, pubDate, contentSnippet, itunes: { image } } = item;
    const date = new Date(pubDate ?? '');
    const unixTimeStamp = date.getTime();
    const cleanEpisodeName = title?.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const episodePath = join(".", 'content', 'episodes', `${unixTimeStamp}-${cleanEpisodeName}`);
    const markdownFilePath = join(episodePath, 'index.md');
    const imageFilePath = join(episodePath, 'featured.jpg');

    // Skip if the episode already exists
    if (fs.existsSync(markdownFilePath)) {
      console.log('Episode already exists', markdownFilePath);
      return;
    }

    const markdownContent = `---\ntitle: "${title}"\ndate: "${date.toISOString()}"\ndraft: false\nexternalUrl: "${item.link}"\ndescription: "${contentSnippet}"\ntags: []\n---\n`;

    fs.mkdirSync(episodePath, { recursive: true });
    fs.writeFileSync(markdownFilePath, markdownContent);
    await downloadFile(image, imageFilePath);

    console.log('Wrote markdown file', markdownFilePath);
    console.log('Wrote image file', imageFilePath);
  });
})();
