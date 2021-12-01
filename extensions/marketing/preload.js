module.exports = function (SOCIALBROWSER) {
    if (document.location.hostname.like('*amazon.eg*')) {
        SOCIALBROWSER.log(' >>> marketing Extention activated : ' + document.location.href);
        SOCIALBROWSER.onLoad(() => {
            SOCIALBROWSER.__showBotImage();
            SOCIALBROWSER.menu_list.push({
                label: ' ( Price Comparison ) ',
                click: () => {
                    SOCIALBROWSER.call('[send-render-message]', {
                        name: '[open new popup]',
                        url: 'https://www.kanbkam.com/eg/ar/search/l?q=' + document.location.href,
                        referrer: document.location.href,
                        partition: SOCIALBROWSER.partition,
                        user_name: SOCIALBROWSER.session.display,
                        show: true,
                    });
                },
            });
        });
    }
};
