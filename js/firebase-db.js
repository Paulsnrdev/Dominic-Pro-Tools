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

  var db = firebase.firestore();

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

    // Upload a File to Cloudinary and return its public URL.
    // Reads file as base64 first (avoids iOS Safari binary FormData bug),
    // then POSTs the data URL string — works on all browsers including iOS.
    uploadImage: function (file) {
      return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onerror = function () { reject(new Error('Could not read file')); };
        reader.onload = function (e) {
          var formData = new FormData();
          formData.append('file', e.target.result);   // data URL string, not raw binary
          formData.append('upload_preset', 'dpt_uploads');
          var xhr = new XMLHttpRequest();
          xhr.open('POST', 'https://api.cloudinary.com/v1_1/px2m3377/image/upload');
          xhr.onload = function () {
            try {
              var data = JSON.parse(xhr.responseText);
              if (data.error) { reject(new Error(data.error.message)); return; }
              resolve(data.secure_url);
            } catch (e) {
              reject(new Error('Invalid response from Cloudinary'));
            }
          };
          xhr.onerror = function () { reject(new Error('Upload blocked — check connection or try a smaller image')); };
          xhr.send(formData);
        };
        reader.readAsDataURL(file);
      });
    },
  };
})();
