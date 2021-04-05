module.exports = function (child) {
  const { app, session, dialog, ipcMain, protocol, BrowserWindow } = child.electron;

  child.session_name_list = [];

  child.handleSession = function (name) {
    if (!name || child.session_name_list.some((s) => s == name)) {
      return;
    }

    child.session_name_list.push(name);
    child.cookies[name] = []
    let ss = name === '_' ? child.electron.session.defaultSession : child.electron.session.fromPartition(name);

    // let ex_date = Date.now() + 1000 * 60 * 60 * 24 * 30;
    // if (child.coreData.cookies && child.coreData.cookies.length > 0) {
    //   child.coreData.cookies.forEach((co) => {
    //     let scheme = co.secure ? 'https' : 'http';
    //     let host = co.domain[0] === '.' ? co.domain.substr(1) : co.domain;
    //     co.url = scheme + '://' + host;
    //     co.expirationDate = ex_date;
    //     ss.cookies
    //       .set(co)
    //       .then()
    //       .catch((err) => {
    //         console.log(err);
    //         console.log(co);
    //       });
    //   });
    // }

    // setInterval(() => {
    //   ss.flushStorageData()
    //   child.log(` Session flushStorageData ${name}`);
    // }, 1000 * 15);

    ss.setSpellCheckerLanguages(['en-US']);

    setTimeout(() => {
      ss.cookies.on('changed', function (event, cookie, cause, removed) {
        child.sendMessage({
          type: '[cookie-changed]',
          partition: name,
          cookie: cookie,
          removed: removed,
          cause: cause,
        });
      });
    }, 1000 * 3);

    if (child.coreData.var.proxy.enabled && child.coreData.var.proxy.url) {
      ss.setProxy(
        {
          proxyRules: child.coreData.var.proxy.url,
          proxyBypassRules: '127.0.0.1',
        },
        function () {},
      );
    } else {
      ss.setProxy({}, function () {});
    }

    ss.allowNTLMCredentialsForDomains('*');
    ss.userAgent = child.coreData.var.core.user_agent;
    ss.setUserAgent(child.coreData.var.core.user_agent);
    ss.protocol.registerHttpProtocol('browser', (request, callback) => {
      let url = request.url.substr(10);
      url = `http://127.0.0.1:60080/${url}`;
      request.url = url;
      callback(request);
    });
    // ss.protocol.registerHttpProtocol('chrome-error', (request, callback) => {
    //   let url = request.url.substr(10);
    //   url = `http://127.0.0.1:60080/error?url=${url}`;
    //   request.url = url;
    //   callback(request);
    //   console.log('xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
    // });

    const filter = {
      urls: ['*://*/*'],
    };

    ss.webRequest.onBeforeRequest(filter, function (details, callback) {
      if (child.coreData.var.core.off) {
        callback({
          cancel: false,
        });
        return;
      }
      let url = details.url.toLowerCase();
      let source_url = details['referrer'] || details['host'] || url;
      source_url = source_url.toLowerCase();

      // child.log('source url ' , source_url)

      if (url.like('localhost*')) {
        callback({
          cancel: true,
          redirectURL: details.url.replace('localhost:', 'http://localhost:'),
        });
        return;
      }

      // protect from know login info
      if (!url.contains(source_url) && url.like('*favicon.ico*')) {
        callback({
          cancel: true,
        });
        return;
      }

      let info = child.get_overwrite_info(url);
      if (info.overwrite) {
        callback({
          cancel: false,
          redirectURL: info.new_url,
        });
        return;
      }

      let end = false;
      child.coreData.var.white_list.forEach((s) => {
        if (end) {
          return;
        }
        if (s.url.length > 2 && (source_url.like(s.url) || url.like(s.url))) {
          callback({
            cancel: false,
          });
          end = true;
          return;
        }
      });

      if (end) {
        return;
      }

      if (child.coreData.var.black_list) {
        child.coreData.var.black_list.forEach((s) => {
          if (url.like(s.url)) {
            end = true;
            //  child.log(`\n Block black_list :  ${s.url} \n`);
          }
        });

        if (end) {
          callback({
            cancel: false,
            redirectURL: `http://127.0.0.1:60080/block-site?url=${url}&msg=Site in Black List From Setting`,
          });

          return;
        }
      }

      if (child.coreData.var.blocking.allow_safty_mode) {
        child.coreData.var.blocking.un_safe_list.forEach((s) => {
          if (url.like(s.url)) {
            end = true;
            // child.log(`\n Block un_safe_list : ${s.url} \n ${url} \n`);
          }
        });

        if (end) {
          callback({
            cancel: false,
            redirectURL: `http://127.0.0.1:60080/block-site?url=${url}&msg=Not Safe Site From Setting`,
          });

          return;
        }
      }

      if (child.coreData.var.blocking.core.block_ads) {
        child.coreData.var.blocking.ad_list.forEach((l) => {
          if (url.like(l.url)) {
            end = true;
            //child.log(`\n Block Ads : ${l.url} \n ${url} \n`);
          }
        });

        if (end) {
          callback({
            cancel: true,
          });

          return;
        }
      }

      // continue loading url
      callback({
        cancel: false,
      });
    });

    ss.webRequest.onBeforeSendHeaders(filter, function (details, callback) {
      if (child.coreData.var.core.off) {
        details.requestHeaders['User-Agent'] = child.coreData.var.core.user_agent;
        callback({
          cancel: false,
          requestHeaders: details.requestHeaders,
        });
        return;
      }

      let user = child.coreData.var.session_list.find((s) => s.name == name);
      let user_agent = null;
      if (user && user.user_agent && user.user_agent.url) {
        user_agent = user.user_agent.url;
      }

      let exit = false;

      let url = details.url.toLowerCase();
      // child.log(details);
      let source_url = details['referrer'] || details['Referer'] || details['Host'] || details['host'] || url;
      if (source_url) {
        source_url = source_url.toLowerCase();
      }

      let d = child.startTime.toString().substring(0, 9);
      details.requestHeaders = details.requestHeaders || {};

      details.requestHeaders['User-Agent'] = user_agent || details.requestHeaders['User-Agent'] || child.coreData.var.core.user_agent;
      if (details.requestHeaders['User-Agent'] == 'undefined') {
        details.requestHeaders['User-Agent'] = child.coreData.var.core.user_agent;
      }

      if (child.coreData.var.blocking.privacy.enable_finger_protect && child.coreData.var.blocking.privacy.mask_user_agent) {
        let code = name;
        code += new URL(url).hostname;
        code += child.coreData.var.core.id;
        details.requestHeaders['User-Agent'] = details.requestHeaders['User-Agent'].replace(') ', ') (' + child.md5(code) + ') ');
      }

      // set site custom user agent
      child.coreData.var.sites.forEach((site) => {
        if (url.like(site.url) && site.user_agent) {
          details.requestHeaders['User-Agent'] = site.user_agent;
        }
      });

      // Must For Login Problem ^_^
      if (details.url.like('*google.com*|*youtube.com*')) {
        callback({
          cancel: false,
          requestHeaders: details.requestHeaders,
        });
        return;
      }

      // custom header request
      child.coreData.var.custom_request_header_list.forEach((r) => {
        if (url.like(r.url)) {
          r.value_list = r.value_list || [];
          r.value_list.forEach((v) => {
            delete details.requestHeaders[v.name];
            delete details.requestHeaders[v.name.toLowerCase()];
            details.requestHeaders[v.name] = v.value;
          });
          r.delete_list = r.delete_list || [];
          r.delete_list.forEach((key) => {
            delete details.requestHeaders[key];
            delete details.requestHeaders[key.toLowerCase()];
          });
        }
      });

      if (child.coreData.var.blocking.privacy.dnt) {
        details.requestHeaders['DNT'] = '1'; // dont track me
      }

      //details.requestHeaders['Referrer-Policy'] = 'no-referrer';

      // try edit cookies before send [tracking cookies]
      // child.log(details.requestHeaders['Cookie'])

      let cookie_obj = details.requestHeaders['Cookie'] ? child.cookieParse(details.requestHeaders['Cookie']) : null;

      if (cookie_obj && child.coreData.var.blocking.privacy.send_browser_id) {
        cookie_obj['_gab'] = 'sb.' + child.coreData.var.core.id;
      }

      if (cookie_obj && child.coreData.var.blocking.privacy.enable_finger_protect && child.coreData.var.blocking.privacy.block_cloudflare) {
        if (cookie_obj['_cflb']) {
          cookie_obj['_cflb'] = 'cf.' + cookie_obj['_gab'];
        }

        if (cookie_obj['_cf_bm']) {
          cookie_obj['_cf_bm'] = 'cf.' + cookie_obj['_gab'];
        }

        if (cookie_obj['_cfduid']) {
          cookie_obj['_cfduid'] = 'cf.' + cookie_obj['_gab'];
        }

        if (cookie_obj['__cfduid']) {
          cookie_obj['__cfduid'] = 'cf.' + cookie_obj['_gab'];
        }
      }

      if (cookie_obj && !url.like('*google.com*|*youtube.com*')) {
        if (child.coreData.var.blocking.privacy.enable_finger_protect && child.coreData.var.blocking.privacy.hide_gid) {
          if (cookie_obj['_gid']) {
            delete cookie_obj['_gid'];
          }
        }
      }

      if (cookie_obj) {
        if (child.cookies[name]) {
          child.cookies[name].forEach((co) => {
            if (details.url.contains(co.domain)) {
              cookie_obj[co.name] = co.value;
            }
          });
        }
        let cookie_string = child.cookieStringify(cookie_obj);
        details.requestHeaders['Cookie'] = cookie_string;
      }

      if (url.like('browser*') || url.like('*127.0.0.1*')) {
        exit = true;
        callback({
          cancel: false,
          requestHeaders: details.requestHeaders,
        });
        if (exit) {
          return;
        }
      }

      // continue loading url
      callback({
        cancel: false,
        requestHeaders: details.requestHeaders,
      });
    });

    ss.webRequest.onHeadersReceived(filter, function (details, callback) {
      if (child.coreData.var.core.off) {
        callback({
          cancel: false,
          responseHeaders: {
            ...details.responseHeaders,
          },
          statusLine: details.statusLine,
        });
        return;
      }

      let is_white = false;
      child.coreData.var.white_list.forEach((w) => {
        if (details.url.like(w.url)) {
          is_white = true;
        }
      });

      if (is_white) {
        callback({
          cancel: false,
          responseHeaders: {
            ...details.responseHeaders,
          },
          statusLine: details.statusLine,
        });
        return;
      }

      // must delete values before re set

      let a_orgin = details.responseHeaders['Access-Control-Allow-Origin'] || details.responseHeaders['Access-Control-Allow-Origin'.toLowerCase()];
      let a_expose = details.responseHeaders['Access-Control-Expose-Headers'] || details.responseHeaders['Access-Control-Expose-Headers'.toLowerCase()];
      let a_Methods = details.responseHeaders['Access-Control-Allow-Methods'] || details.responseHeaders['Access-Control-Allow-Methods'.toLowerCase()];
      let a_Headers = details.responseHeaders['Access-Control-Allow-Headers'] || details.responseHeaders['Access-Control-Allow-Headers'.toLowerCase()];
      // let s_policy = details.responseHeaders['Content-Security-Policy'] || details.responseHeaders['Content-Security-Policy'.toLowerCase()];

      // Must Delete Before set new values [duplicate headers]
      [
        //'Cross-Origin-Embedder-Policy',
        // 'Cross-Origin-Opener-Policy',
        //  'Strict-Transport-Security',
        // 'X-Content-Type-Options',
        'Access-Control-Allow-Credentials',
        'Access-Control-Allow-Methods',
        'Access-Control-Allow-Headers',
        'Access-Control-Allow-Origin',
        'Access-Control-Expose-Headers',
        child.coreData.var.blocking.privacy.remove_x_frame_options ? 'X-Frame-Options' : '',
      ].forEach((p) => {
        delete details.responseHeaders[p];
        delete details.responseHeaders[p.toLowerCase()];
      });

      details.responseHeaders['Access-Control-Allow-Credentials'.toLowerCase()] = 'true';
      details.responseHeaders['Access-Control-Allow-Methods'.toLowerCase()] = a_Methods || 'POST,GET,DELETE,PUT,OPTIONS,VIEW,HEAD,CONNECT,TRACE';
      details.responseHeaders['Access-Control-Allow-Headers'.toLowerCase()] =
        a_Headers || 'Authorization ,Access-Control-Allow-Headers, Access-Control-Request-Method, Access-Control-Request-Headers,Origin, X-Requested-With, Content-Type, Accept';

      if (a_orgin) {
        details.responseHeaders['Access-Control-Allow-Origin'.toLowerCase()] = [a_orgin[0]];
      }
      if (a_expose) {
        details.responseHeaders['Access-Control-Expose-Headers'.toLowerCase()] = a_expose;
      }
      // details.responseHeaders['Cross-Origin-Resource-Policy'.toLowerCase()] = 'cross-origin';

      child.coreData.var.overwrite.urls.forEach((data) => {
        if (details.url.like(data.to)) {
          if (data.rediect_from) {
            // details.responseHeaders['Access-Control-Allow-Origin'.toLowerCase()] = [child.coreData.url.parse(data.rediect_from, false).host];
            details.responseHeaders['Access-Control-Allow-Origin'.toLowerCase()] = ['*'];
          }
        }
      });

      callback({
        cancel: false,
        responseHeaders: {
          ...details.responseHeaders,
        },
        statusLine: details.statusLine,
      });
    });
    ss.webRequest.onResponseStarted(filter, function (details) {});
    ss.webRequest.onBeforeRedirect(filter, function (details) {});
    ss.webRequest.onCompleted(filter, function (details) {});
    ss.webRequest.onErrorOccurred(filter, function (details) {});

    ss.setPermissionRequestHandler((webContents, permission, callback) => {
      // https://www.electronjs.org/docs/api/session
      if (!child.coreData.var.blocking.permissions) {
        callback(false);
        return;
      }
      if (webContents.getURL().like('http://127.0.0.1*|https://127.0.0.1*')) {
        callback(true);
      } else {
        let allow = child.coreData.var.blocking.permissions['allow_' + permission.replace('-', '_')] || false;
        // child.log(` \n  <<< setPermissionRequestHandler ${permission} ( ${allow} )  ${webContents.getURL()} \n `);
        callback(allow);
      }
    });
    ss.setPermissionCheckHandler((webContents, permission) => {
      if (!child.coreData.var.blocking.permissions) {
        return false;
      }
      if (webContents.getURL().like('http://127.0.0.1*|https://127.0.0.1*')) {
        return true;
      } else {
        let allow = child.coreData.var.blocking.permissions['allow_' + permission.replace('-', '_')] || false;
        // child.log(` \n  <<< setPermissionCheckHandler ${permission} ( ${allow} )  ${webContents.getURL()} \n `);
        return allow;
      }
    });
    ss.on('will-download', (event, item, webContents) => {
      event.preventDefault();
      child.sendMessage({
        type: '[download-link]',
        partition: name,
        url: item.getURL(),
      });
    });
    child.log(`Handle Session ${name} ( done ) `);
    return ss;
  };

  child.on('[handle-session]', (e, name) => {
    child.handleSession(name);
  });

  child.sessionConfig = () => {
    child.handleSession(child.coreData.options.partition);
    child.handleSession('_');
  };
};