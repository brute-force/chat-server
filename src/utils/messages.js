const request = require('superagent');

// async replace of youtube links with link and title
const asyncReplaceYouTubeLinks = async (str, regex) => {
  var regexTubes = /https:\/\/(www\.)?(youtube.com|youtu.be)\/(watch\?v=)?.{11}((\?|&)t=\d+)?/g;

  const promises = [];

  // collect all the promises
  str.replace(regexTubes, (match) => {
    const tube = match.replace(/watch\?v=/, 'embed/');
    const tubeId = tube.substring(tube.lastIndexOf('/') + 1).replace(/\?t=\d+$/, '');

    let uri = 'https://www.googleapis.com/youtube/v3/videos?part=snippet&fields=items(id,snippet(title))';
    uri += `&id=${tubeId}&key=${process.env.GOOGLE_YOUTUBE_V3_API_KEY}`;

    promises.push(request.get(uri).then((res) => [match, res.body.items[0].snippet.title]));
  });

  // EXECUTE THEM
  const results = await Promise.all(promises);

  const replacements = results.reduce((a, [id, title]) => {
    a[id] = title;
    return a;
  }, {});

  // replace the links
  return str.replace(regexTubes, (match) => {
    return `<a href="${match}">${replacements[match]}</a>`;
  });
};

const generateMessage = (username, message) => {
  return {
    username,
    message,
    createdAt: new Date().getTime()
  };
};

module.exports = {
  generateMessage,
  asyncReplaceYouTubeLinks
};
