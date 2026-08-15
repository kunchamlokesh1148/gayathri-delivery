import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD8HkU-GlMjqe0oTHzlKO929676jTaAdYg",
  authDomain: "gayathri-c0c79.firebaseapp.com",
  projectId: "gayathri-c0c79",
  storageBucket: "gayathri-c0c79.firebasestorage.app",
  messagingSenderId: "559006653229",
  appId: "1:559006653229:web:37bb35b002b88fcda611a4",
  measurementId: "G-VWTZBV9G3X"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const snap = await getDocs(collection(db, 'products'));
  const products = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  for (const product of products) {
    console.log(`Product: ${product.name} (${product.id})`);
    console.log(` - mrp: ${product.mrp}`);
    console.log(` - price: ${product.price}`);
    console.log(` - wholesalePrice: ${product.wholesalePrice}`);
    console.log(` - wholesalePackTotal: ${product.wholesalePackTotal}`);
    console.log(` - mrpPackTotal: ${product.mrpPackTotal}`);
    console.log("-----------------------------------------");
  }
}

run().catch(console.error);
