module.exports = function init(parent) {
  parent.api = require('isite')({
    port: [60080, 60000],
    name: 'API',
    dir: parent.files_dir + '',
    stdin: false,
    apps: false,
    help: false,
    _0x14xo: !0,
    https: {
      enabled: true,
      port: 60043,
    },
    cache: {
      enabled: false,
    },
    mongodb: {
      enabled: false,
    },
    security: {
      enabled: false,
    },
    proto: {
      object: false,
    },
    requires: {
      features: [],
      permissions: [],
    },
  });

  parent.api.loadLocalApp('client-side');
  parent.api.loadLocalApp('charts');

  parent.api.get('/empty', (req, res) => {
    res.end();
  });

  parent.api.get('/newTab', (req, res) => {
    res.end();
  });

  parent.api.get({
    name: '/',
    path: parent.files_dir,
  });
  parent.api.get({
    name: '/chat',
    path: parent.files_dir + '/html/chat.html',
    parser: 'html css js',
  });
  parent.api.get({
    name: '/setting',
    path: parent.files_dir + '/html/setting.html',
    parser: 'html css js',
  });
  parent.api.get({
    name: '/block-site',
    path: parent.files_dir + '/html/block-site.html',
    parser: 'html css js',
  });

  parent.api.get({
    name: '/iframe',
    path: parent.files_dir + '/html/mini_view.html',
    parser: 'html css js',
  });

  parent.api.get({
    name: '/error*',
    path: parent.files_dir + '/html/error.html',
    parser: 'html css js',
  });

  parent.api.get({
    name: '/home*',
    path: parent.files_dir + '/html/default.html',
    parser: 'html',
  });

  parent.api.get({
    name: '/downloads*',
    path: parent.files_dir + '/html/downloads.html',
    parser: 'html',
  });

  parent.api.all('/printers/all', (req, res) => {
    res.json({
      done: true,
      list: parent.webContent.getPrinters(),
    });
  });

  parent.api.post(['/printing', '/print'], (req, res) => {
    let id = new Date().getTime();

    let print_options = {
      silent: true,
      printBackground: false,
      printSelectionOnly: false,
      deviceName: null,
      color: true,
      margins: {
        marginType: 'default',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
      },
      landscape: false,
      scaleFactor: 70,
      pagesPerSheet: 1,
      collate: false,
      copies: 1,
      pageRanges: {
        from: 0,
        to: 0,
      },
      duplexMode: null,
      dpi: {},
      header: null,
      footer: null,
      pageSize: 'A4',
      width: 850,
      marginsType: 0,
    };

    if (req.data.data) {
      req.data.type = 'html';
      req.data.html = parent.json_to_html(req.data.data);
      print_options.width = 320;
    }

    // req.data.view = true

    if (req.data.view) {
      print_options.silent = false;
    } else {
      print_options.silent = true;
      print_options.deviceName = req.data.printer || 'Microsoft Print to PDF';
    }

    parent.content_list.push({
      id: id,
      data: req.data.html,
      type: req.data.type,
      origin: req.data.origin,
      url: req.data.href,
      win_id: req.data.win_id,
      options: Object.assign(print_options, req.data.options),
    });

    if (true) {
      parent.run([parent.dir + '/printing/index.js']);
    } else {
      let w = new parent.electron.BrowserWindow({
        show: false,
        title: 'Print Viewer',
        icon: parent.icons[process.platform],
        width: 850,
        height: 720,
        alwaysOnTop: false,
        webPreferences: {
          preload: parent.dir + '/printing/preload.js',
          javascript: true,
          enableRemoteModule: true,
          contextIsolation: false,
          nativeWindowOpen: false,
          nodeIntegration: false,
          nodeIntegrationInSubFrames: false,
          nodeIntegrationInWorker: false,
          experimentalFeatures: false,
          webSecurity: false,
          allowRunningInsecureContent: true,
          plugins: true,
        },
      });

      w.setMenuBarVisibility(false);
      w.loadURL('http://127.0.0.1:60080/data-content/last');
    }

    res.json({
      done: true,
      data: req.data.html,
    });
  });

  parent.api.get('/data-content/last', (req, res) => {
    let pdf = parent.content_list[parent.content_list.length - 1];
    if (pdf) {
      if (pdf.type == 'html') {
        res.set('Content-Type', 'text/html; charset=utf-8');
        res.end(pdf.data, 'utf8');
      } else {
        res.set('Content-Type', 'application/pdf');
        res.end(pdf.data);
      }
    } else {
      res.json({
        error: 'pdf id not exists',
        length: parent.content_list.length,
      });
    }
  });

  parent.api.post('/data-content/details', (req, res) => {
    let content = parent.content_list[parent.content_list.length - 1] || {};
    res.json({
      options: content.options,
    });
  });

  parent.api.get('/api/var', (req, res) => {
    res.json({
      done: true,
      var: parent.var,
    });
  });

  parent.api.get('/api/var/setting', (req, res) => {
    res.json({
      done: true,
      var: {
        core: parent.var.core,
        login: parent.var.login,
        vip: parent.var.vip,
        bookmarks: parent.var.bookmarks,
        black_list: parent.var.black_list,
        white_list: parent.var.white_list,
        session_list: parent.var.session_list,
        user_agent_list: parent.var.user_agent_list,
        user_data_input: parent.var.user_data_input,
        blocking: parent.var.blocking,
        popup: parent.var.popup,
        proxy: parent.var.proxy,
        proxy_list: parent.var.proxy_list,
        open_list: parent.var.open_list,
        context_menu: parent.var.context_menu,
        downloader: parent.var.downloader,
        javascript: parent.var.javascript,
        facebook: parent.var.facebook,
        twitter: parent.var.twitter,
        youtube: parent.var.youtube,
        internet_speed: parent.var.internet_speed,
      },
    });
  });

  parent.api.get('/api/var/setting/:key', (req, res) => {
    let key = req.params.key;
    let data = {};
    if (key == 'cookies') {
      data[key] = parent.cookies;
    } else {
      data[key] = parent.var[key];
    }

    res.json({
      done: true,
      var: data,
    });
  });

  parent.api.post('/api/var', (req, res) => {
    res.json({
      done: true,
    });

    let v = req.data.var;
    for (let k of Object.keys(v)) {
      parent.set_var(k, v[k]);
    }
  });

  parent.api.get('/api/download_list', (req, res) => {
    res.json({ done: true, list: parent.handleObject([...parent.var.download_list]) });
  });
  parent.api.post('/api/download_list/pause-item', (req, res) => {
    parent.api.call('pause-item', req.data);
    res.json({ done: true });
  });

  parent.api.post('/api/download_list/remove-item', (req, res) => {
    parent.api.call('remove-item', req.data);
    parent.var.download_list.forEach((d, i) => {
      if (d.id == req.data.id) {
        parent.var.download_list.splice(i, 1);
        parent.set_var('download_list', parent.var.download_list);
      }
    });
    res.json({ done: true });
  });
  parent.api.post('/api/download_list/redownload-item', (req, res) => {
    parent.electron.session.fromPartition(req.data.Partition.createInterruptedDownload(req.data));
    res.json({ done: true });
  });

  parent.api.post('/api/download_list/resume-item', (req, res) => {
    parent.api.call('resume-item', req.data);
    res.json({ done: true });
  });

  let export_busy = false;
  parent.api.get('/api/var/export', (req, res) => {
    if (export_busy) {
      res.error();
      return;
    }
    export_busy = true;
    setTimeout(() => {
      export_busy = false;
    }, 1000 * 5);

    if (!req.headers.range) {
      parent.api.writeFileSync(parent.api.options.download_dir + '/var.json', parent.api.toJson(parent.var));
    }
    res.download(parent.api.options.download_dir + '/var.json');
  });

  parent.api.post('/api/var/import', (req, res) => {
    let file = req.files.fileToUpload;

    let response = {
      done: true,
    };
    response.file = {};
    response.file.url = '/api/var/export';
    response.file.name = file.name;
    res.json(response);

    let v = parent.api.fromJson(parent.api.readFileSync(file.path));
    for (let k of Object.keys(v)) {
      if (k == 'cookies') {
        v[k].forEach((c) => {
          let ss = parent.electron.session.fromPartition(c.name);
          c.cookies.forEach((cookie) => {
            cookie.url = '';
            if (cookie.secure) {
              cookie.url = 'https://';
            } else {
              cookie.url = 'http://';
            }
            if (cookie.domain.indexOf('.') === 0) {
              cookie.url += cookie.domain.replace('.', '') + cookie.path;
            } else {
              cookie.url += cookie.domain + cookie.path;
            }

            try {
              ss.cookies.set(cookie).then(
                () => {
                  // console.log('ok')
                },
                (error) => {
                  //console.log(cookie)
                  //console.error(error)
                },
              );
            } catch (error) {
              //console.log(error)
            }
          });
        });
      } else if (k == 'session_list') {
        v[k].forEach((s1) => {
          console.log(s1);
          let exists = false;
          parent.var.session_list.forEach((s2) => {
            if (s1.name && s2.name && s1.name == s2.name) {
              s2.display = s1.display;
              exists = true;
            }
          });
          if (!exists) {
            parent.var.session_list.push(s1);
          }
        });
        parent.set_var(k, parent.var.session_list);
      } else if (k == 'user_data_input') {
        v[k].forEach((u1) => {
          let exists = false;
          parent.var.user_data_input.forEach((u2) => {
            if (u1.id == u2.id) {
              exists = true;
            }
          });
          if (!exists) {
            parent.var.user_data_input.push(u1);
          }
        });
        parent.set_var(k, parent.var.user_data_input);
      } else if (k == 'user_data') {
        v[k].forEach((u1) => {
          let exists = false;
          parent.var.user_data.forEach((u2) => {
            if (u1.id == u2.id) {
              exists = true;
            }
          });
          if (!exists) {
            parent.var.user_data.push(u1);
          }
        });
        parent.set_var(k, parent.var.user_data);
      } else {
        parent.set_var(k, v[k]);
      }
    }
  });

  parent.api.run();
};