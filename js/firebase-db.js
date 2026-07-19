(function () {
  if (!window.firebase) { console.warn('[DPT_DB] Firebase SDK not loaded'); return; }
  if (!firebase.apps.length) {
    firebase.initializeApp({
      apiKey:            "AIzaSyAOwePcIYoEWlxkIVg_vWWL6B8QZk3Hs6s",
      authDomain:        "dominic-pro-tools.firebaseapp.com",
      projectId:         "dominic-pro-tools",
      storageBucket:     "dominic-pro-tools.firebasestorage.app",
      messagingSenderId: "819572491643",
      appId:             "1:819572491643:web:9f4f945936abbb4f8069de",
    });
  }

  var db      = firebase.firestore();
  var storage = firebase.storage();

  var KEY_MAP = {
    dpt_product_overrides: { docId: 'product_overrides', list: false },
    dpt_products_custom:   { docId: 'custom_products',   list: true  },
    dpt_cat_overrides:     { docId: 'cat_overrides',     list: false },
    dpt_cats_custom:       { docId: 'cats_custom',       list: true  },
    dpt_sale:              { docId: 'sale',               list: false },
  };

  function dRef(docId) { return db.collection('dpt_data').doc(docId); }

  window.DPT_DB = {
    pull: async function () {
      try {
        var keys = Object.keys(KEY_MAP);
        var snaps = await Promise.all(keys.map(function (k) { return dRef(KEY_MAP[k].docId).get(); }));
        snaps.forEach(function (snap, i) {
          if (!snap.exists) return;
          var key = keys[i];
          var data = snap.data();
          var val = KEY_MAP[key].list ? (data.list || []) : data;
          localStorage.setItem(key, JSON.stringify(val));
        });
      } catch (err) {
        console.warn('[DPT_DB] pull failed — using local cache', err);
      }
    },

    push: async function (lsKey, value) {
      var cfg = KEY_MAP[lsKey];
      if (!cfg) return;
      await dRef(cfg.docId).set(cfg.list ? { list: value } : value);
    },

    // Upload a File to Firebase Storage and return its public download URL.
    // folder: 'products' or 'categories'
    uploadImage: function (file, folder) {
      var ext      = file.name.split('.').pop().toLowerCase();
      var filename = Date.now() + '-' + Math.random().toString(36).slice(2) + '.' + ext;
      var ref      = storage.ref((folder || 'products') + '/' + filename);
      return ref.put(file).then(function (snapshot) {
        return snapshot.ref.getDownloadURL();
      });
    },
  };
})();
