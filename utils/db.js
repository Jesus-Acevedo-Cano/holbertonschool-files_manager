const { MongoClient } = require('mongodb');

const host = process.env.DB_HOST || 'localhost';
const port = process.env.DB_PORT || 27017;
const database = process.env.DB_DATABASE || 'files_manager';
const url = `mongodb://${host}:${port}`;

class DBClient {
  constructor() {
    MongoClient.connect(url, (err, client) => {
      if (err) this.db = false;
      else this.db = client.db(database);
    });
  }

  isAlive() {
    if (this.db) return true;
    return false;
  }

  async nbUsers() {
    return this.db.collection('users').countDocuments();
  }

  async nbFiles() {
    return this.db.collection('files').countDocuments();
  }

  async createUser(user) {
    return this.db.collection('users').insertOne(user);
  }

  async getUser(user) {
    return this.db.collection('users').findOne(user);
  }
}

const dbClient = new DBClient();
export default dbClient;
