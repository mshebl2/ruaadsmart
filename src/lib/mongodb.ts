import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;

let clientPromise: Promise<MongoClient>;

if (!uri) {
  clientPromise = new Promise((_, reject) => {
    reject(new Error('Please add your Mongo URI to environment variables (MONGODB_URI)'));
  });
  // catch early to prevent unhandled rejection warnings at build time
  clientPromise.catch(() => {});
} else if (process.env.NODE_ENV === 'development') {
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    const client = new MongoClient(uri);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  const client = new MongoClient(uri);
  clientPromise = client.connect();
}

export default clientPromise;
