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
    const wholesaleUnit = String(product?.wholesaleUnit || product?.unit || 'Piece').toLowerCase();
    const packQuantity = parseInt(product?.packQuantity) || 12;
    const stockQty = product?.stockQty !== undefined ? product.stockQty : (product?.stock !== undefined ? product.stock : 0);

    const isPack = wholesaleUnit.includes('pack') || wholesaleUnit.includes('box');
    const availablePacks = isPack ? Math.floor(stockQty / packQuantity) : stockQty;

    console.log(`Product: ${product.name} (${product.id})`);
    console.log(` - wholesaleUnit raw: ${product.wholesaleUnit}`);
    console.log(` - unit raw: ${product.unit}`);
    console.log(` - wholesaleUnit parsed: ${wholesaleUnit}`);
    console.log(` - packQuantity raw: ${product.packQuantity}`);
    console.log(` - packQuantity parsed: ${packQuantity}`);
    console.log(` - stockQty raw: ${product.stockQty}`);
    console.log(` - stock raw: ${product.stock}`);
    console.log(` - stockQty parsed: ${stockQty}`);
    console.log(` - isPack: ${isPack}`);
    console.log(` - availablePacks: ${availablePacks}`);
    console.log("-----------------------------------------");
  }
}

run().catch(console.error);
