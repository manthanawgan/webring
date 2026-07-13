const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const MEMBERS_PATH = path.join(__dirname, 'members.json');

function getSanitizedMembers() {
  const raw = fs.readFileSync(MEMBERS_PATH, 'utf8');
  const members = JSON.parse(raw);
  return members.filter((member) => member.url && member.url.trim() !== '');
}

function findMemberIndex(members, from) {
  const query = from.toLowerCase().trim();
  return members.findIndex(
    (member) =>
      member.id.toLowerCase() === query ||
      member.name.toLowerCase().trim() === query
  );
}

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/members.json', (req, res) => {
  res.type('json').send(fs.readFileSync(MEMBERS_PATH, 'utf8'));
});

app.get('/redirect', (req, res) => {
  const members = getSanitizedMembers();
  const { from, dir } = req.query;

  if (!from || !dir || (dir !== 'next' && dir !== 'prev')) {
    return res.redirect('/');
  }

  const index = findMemberIndex(members, from);
  if (index === -1) {
    return res.redirect('/');
  }

  const targetIndex =
    dir === 'next'
      ? (index + 1) % members.length
      : (index - 1 + members.length) % members.length;

  res.redirect(members[targetIndex].url);
});

app.get('/random', (req, res) => {
  const members = getSanitizedMembers();

  if (members.length === 0) {
    return res.redirect('/');
  }

  const randomMember = members[Math.floor(Math.random() * members.length)];
  res.redirect(randomMember.url);
});


if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Webring server running on http://localhost:${PORT}`);
  });
}

//export the Express app so Vercel can use it as a serverless function (nw)
module.exports = app;