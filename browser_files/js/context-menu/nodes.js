module.exports = function (SOCIALBROWSER) {
  let xwin = SOCIALBROWSER.electron.remote.getCurrentWindow();
  let partition = xwin.webContents.getWebPreferences().partition;

  function isNG(url) {
    return decodeURI(url).indexOf('{{') > -1;
  }

  function a_handle(a) {
    if (
      a.tagName == 'A' &&
      a.getAttribute('target') == '_blank' &&
      !isNG(a.href) &&
      !a.href.like('*youtube.com*') &&
      !a.href.like('*#___new_tab___*|*#___new_popup___*|*#___trusted_window___*') &&
      !a.getAttribute('onclick') &&
      !a.getAttribute('xlink')
    ) {
      a.setAttribute('xlink', 'done');
      a.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        if(document.location.href.like("https://www.youtube.com/embed*")){
          window.location.href =a.href
          return
          SOCIALBROWSER.call('render_message', {
            name: 'new_popup',
            referrer: document.location.href,
            url: a.href,
            partition: partition,
            user_name : SOCIALBROWSER.var.session_list.filter(s => s.name == partition)[0].display,
            win_id : SOCIALBROWSER.currentWindow.id
          });
        }else{
          SOCIALBROWSER.call('render_message', {
            name: '[open new tab]',
            referrer: document.location.href,
            url: a.href,
            partition: partition,
            user_name : SOCIALBROWSER.var.session_list.filter(s => s.name == partition)[0].display,
            win_id : SOCIALBROWSER.currentWindow.id
          });
        }


      });
    }
  }

  window.addEventListener(
    'DOMNodeInsertedIntoDocument',
    (e) => {
      a_handle(e.target);
    },
    false,
  );
  window.addEventListener(
    'DOMNodeInserted',
    (e) => {
      a_handle(e.target);
    },
    false,
  );

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('a').forEach((a) => {
      a_handle(a);
    });
  });
};
