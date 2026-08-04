const { MongoClient } = require('mongodb');

async function main() {
  const uri = "mongodb+srv://mshebl215_db_user:P3qgn2WX6C4W2JCj@cluster0.qdsur90.mongodb.net/?appName=Cluster0";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const adminDb = client.db().admin();
    const { databases } = await adminDb.listDatabases();
    
    console.log("Databases:");
    for (const dbInfo of databases) {
      console.log(`- ${dbInfo.name}`);
      
      if (dbInfo.name !== 'admin' && dbInfo.name !== 'local') {
        const db = client.db(dbInfo.name);
        const collections = await db.listCollections().toArray();
        console.log(`  Collections in ${dbInfo.name}:`);
        for (const coll of collections) {
          const count = await db.collection(coll.name).countDocuments();
          console.log(`    - ${coll.name} (${count} documents)`);
        }
      }
    }
  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
  }
}

main().catch(console.error);
