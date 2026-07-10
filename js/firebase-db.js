import { initializeApp }                     from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const app = initializeApp({
  apiKey:            "AIzaSyAOwePcIYoEWlxkIVg_vWWL6B8QZk3Hs6s",
  authDomain:        "dominic-pro-tools.firebaseapp.com",
  projectId:         "dominic-pro-tools",
  storageBucket:     "dominic-pro-tools.firebasestorage.app",
  messagingSenderId: "819572491643",
  appId:             "1:819572491643:web:9f4f945936abbb4f8069de",
});

const db = getFirestore(app);

/* Maps each localStorage key → its Firestore doc name + whether the value is a list */
const KEY_MAP = {
  dpt_product_overrides: { docId: 'product_overrides', list: false },
  dpt_products_custom:   { docId: 'custom_products',   list: true  },
  dpt_cat_overrides:     { docId: 'cat_overrides',     list: false },
  dpt_cats_custom:       { docId: 'cats_custom',       list: true  },
  dpt_sale:              { docId: 'sale',               list: false },
};

const dRef = id => doc(db, 'dpt_data', id);

window.DPT_DB = {
  /** Pull all catalog data from Firestore → update localStorage on every device */
  async pull() {
    try {
      const keys  = Object.keys(KEY_MAP);
      const snaps = await Promise.all(keys.map(k => getDoc(dRef(KEY_MAP[k].docId))));
      snaps.forEach((snap, i) => {
        if (!snap.exists()) return;
        const key = keys[i];
        const val = KEY_MAP[key].list ? (snap.data().list ?? []) : snap.data();
        localStorage.setItem(key, JSON.stringify(val));
      });
    } catch (err) {
      console.warn('[DPT_DB] pull failed — using local cache', err);
    }
  },

  /** Write a localStorage key's value to Firestore so all devices see it */
  async push(lsKey, value) {
    const cfg = KEY_MAP[lsKey];
    if (!cfg) return;
    await setDoc(dRef(cfg.docId), cfg.list ? { list: value } : value);
  },
};
