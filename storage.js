const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data', 'data.json');

// Make sure the data file exists before anything tries to read it.
function ensureFile() {
  if (!fs.existsSync(path.dirname(DATA_FILE))) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ users: {} }, null, 2));
  }
}

function readData() {
  ensureFile();
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (e) {
    // Corrupt file safety net - start fresh rather than crashing the bot.
    return { users: {} };
  }
}

// Very small write queue so two near-simultaneous submissions
// can't clobber each other's writes to the JSON file.
let writeQueue = Promise.resolve();
function writeData(data) {
  writeQueue = writeQueue.then(() => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  });
  return writeQueue;
}

async function addPurchase(userId, username, item, cost) {
  const data = readData();

  if (!data.users[userId]) {
    data.users[userId] = { username, totalSpent: 0, items: [] };
  }

  // Keep the stored username fresh in case they changed it.
  data.users[userId].username = username;
  data.users[userId].totalSpent += cost;
  data.users[userId].items.push({
    item,
    cost,
    date: new Date().toISOString()
  });

  await writeData(data);
  return data.users[userId];
}

function getUser(userId) {
  const data = readData();
  return data.users[userId] || null;
}

// Admin override: directly set a user's all-time total to a specific value.
// Does not touch their item history list.
async function setTotal(userId, username, amount) {
  const data = readData();

  if (!data.users[userId]) {
    data.users[userId] = { username, totalSpent: 0, items: [] };
  }

  data.users[userId].username = username;
  data.users[userId].totalSpent = amount;

  await writeData(data);
  return data.users[userId];
}

module.exports = { addPurchase, getUser, setTotal };
