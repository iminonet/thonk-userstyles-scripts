// ==UserScript==
// @name         Google+ Share button for V3
// @namespace    http://tampermonkey.net/
// @version      2024-12-21
// @description  Brings back the Google+ share button with community tab compatibility.
// @author       thonkbot
// @match        *://*.youtube.com/*
// @icon         https://ssl.gstatic.com/s2/oz/images/faviconr2.ico
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    var sbutils = {
		waitForElm: function (selector) {
			return new Promise(resolve => {
				if (document.querySelector(selector)) {
					return resolve(document.querySelector(selector));
				}
				const observer = new MutationObserver(mutations => {
					if (document.querySelector(selector)) {
						observer.disconnect();
						resolve(document.querySelector(selector));
					}
				});
				observer.observe(document, {
					childList: true,
					subtree: true
				});
			});
		},
        getSapisidhash: function () {
            class Sha1 {
                static hash(msg, options) {
                    const defaults = { msgFormat: 'string', outFormat: 'hex' };
                    const opt = Object.assign(defaults, options);
                    switch (opt.msgFormat) {
                        default:
                        case 'string':   msg = utf8Encode(msg);       break;
                        case 'hex-bytes':msg = hexBytesToString(msg); break;
                    }
                    const K = [ 0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xca62c1d6 ];
                    const H = [ 0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0 ];
                    msg += String.fromCharCode(0x80);
                    const l = msg.length/4 + 2;
                    const N = Math.ceil(l/16);
                    const M = new Array(N);
                    for (let i=0; i<N; i++) {
                        M[i] = new Array(16);
                        for (let j=0; j<16; j++) {
                            M[i][j] = (msg.charCodeAt(i*64+j*4+0)<<24) | (msg.charCodeAt(i*64+j*4+1)<<16)
                            | (msg.charCodeAt(i*64+j*4+2)<< 8) | (msg.charCodeAt(i*64+j*4+3)<< 0);
                        }
                    }
                    M[N-1][14] = ((msg.length-1)*8) / Math.pow(2, 32); M[N-1][14] = Math.floor(M[N-1][14]);
                    M[N-1][15] = ((msg.length-1)*8) & 0xffffffff;
                    for (let i=0; i<N; i++) {
                        const W = new Array(80);
                        for (let t=0;  t<16; t++) W[t] = M[i][t];
                        for (let t=16; t<80; t++) W[t] = Sha1.ROTL(W[t-3] ^ W[t-8] ^ W[t-14] ^ W[t-16], 1);
                        let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4];
                        for (let t=0; t<80; t++) {
                            const s = Math.floor(t/20);
                            const T = (Sha1.ROTL(a, 5) + Sha1.f(s, b, c, d) + e + K[s] + W[t]) >>> 0;
                            e = d;
                            d = c;
                            c = Sha1.ROTL(b, 30) >>> 0;
                            b = a;
                            a = T;
                        }
                        H[0] = (H[0]+a) >>> 0;
                        H[1] = (H[1]+b) >>> 0;
                        H[2] = (H[2]+c) >>> 0;
                        H[3] = (H[3]+d) >>> 0;
                        H[4] = (H[4]+e) >>> 0;
                    }
                    for (let h=0; h<H.length; h++) H[h] = ('00000000'+H[h].toString(16)).slice(-8);
                    const separator = opt.outFormat=='hex-w' ? ' ' : '';
                    return H.join(separator);
                    function utf8Encode(str) {
                        try {
                            return new TextEncoder().encode(str, 'utf-8').reduce((prev, curr) => prev + String.fromCharCode(curr), '');
                        } catch (e) {
                            return unescape(encodeURIComponent(str));
                        }
                    }
                    function hexBytesToString(hexStr) {
                        const str = hexStr.replace(' ', '');
                        return str=='' ? '' : str.match(/.{2}/g).map(byte => String.fromCharCode(parseInt(byte, 16))).join('');
                    }
                }
                static f(s, x, y, z)  {
                    switch (s) {
                        case 0: return (x & y) ^ (~x & z);
                        case 1: return  x ^ y  ^  z;
                        case 2: return (x & y) ^ (x & z) ^ (y & z);
                        case 3: return  x ^ y  ^  z;
                    }
                }
                static ROTL(x, n) {
                    return (x<<n) | (x>>>(32-n));
                }
            }
            function gethash()
            {
                function getCookie(cname)
                {
                    var name = cname + "=";
                    var decodedCookie = decodeURIComponent(document.cookie);
                    var ca = decodedCookie.split(';');
                    for(var i = 0; i <ca.length; i++) {
                        var c = ca[i];
                        while (c.charAt(0) == ' ') {
                            c = c.substring(1);
                        }
                        if (c.indexOf(name) == 0)
                        {
                            return c.substring(name.length, c.length);
                        }
                    }
                    return "";
                }
                var time = (Math.round(new Date() / 1000));
                var xorigin = "https://www.youtube.com";
                var sapisid = getCookie("SAPISID");
                var hash = Sha1.hash(time + " " + sapisid + " " + xorigin);
                return ("SAPISIDHASH " + time + "_" + hash);
            }
            return gethash();
        },
        encodeucid: function(ucid) {
            // protobufpal didnt do the job so have this
            var encoded = btoa(atob('ChhQUk9UT0JVRkhFUkUQATICGAdKAggC').replaceAll('PROTOBUFHERE',ucid));
            return encoded;
        },
        ajax: {
            innertuberequest: function (url, params, name, version) {
                var authorization;
                var body = `{"context": {"client": {"clientName": "${name}", "clientVersion": "${version}", "hl": "en"}}${params == '' ? '' : ','} ${params}}`;
                if (yt.config_.LOGGED_IN) {
                    authorization = sbutils.getSapisidhash();
                }
                return fetch(url + "&key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8", {
                    method: "POST",
                    headers: {
                        "accept": "application/json, text/plain, /",
                        "accept-language": "en-US,en;q=0.9",
                        "content-type": "application/json",
                        "sec-ch-ua-mobile": "?0",
                        "sec-fetch-dest": "empty",
                        "sec-fetch-mode": "cors",
                        "sec-fetch-site": "same-origin",
                        authorization
                    },
                    body: body
                })
                .then((response) => {
                    if(response.ok) {
                        return response.json();
                    } else {
                        throw new Error('Server response wasn\'t OK');
                    }
                })
            },
            getaccountswitcherendpoint: function () {
                return fetch('//www.youtube.com/getAccountSwitcherEndpoint', {
                    method: "GET",
                    headers: {
                        "accept": "application/json, text/plain, /",
                        "accept-language": "en-US,en;q=0.9",
                        "content-type": "application/json",
                        "sec-ch-ua-mobile": "?0",
                        "sec-fetch-dest": "empty",
                        "sec-fetch-mode": "cors",
                        "sec-fetch-site": "same-origin"
                    }
                })
                .then(response => response.text()).then(data => {
                    return JSON.parse(data.replace(`)]}'`,``));
                })
            }
        },
        template: {
            share: {
                box: `<div class="distiller_yt-sb-container"><div class="distiller_yt-sb-standin" onclick='this.nextElementSibling.classList.remove("hid"),this.nextElementSibling.querySelector("[contenteditable]").focus()'><div class="body"><div class="box focus_caller"><span class="share focus_caller"><span class="run run-text">Share what's new...</span></span></div></div></div><div class="distiller_yt-sb hid"><div class="body"><div class="sb_text_input" contenteditable="True"><br></div></div></div></div>`,
                button: '<button class="" id="yt-share-sb-parent" href="https://plus.google.com/u/0/stream/all?hl=en" onclick="return false;" aria-haspopup="true"><div id="yt-share-sb"><span id="yt-share-sb-plus"></span><span id="yt-share-sb-comp">&nbsp;</span><span id="yt-share-sb-title">Share</span><span id="yt-share-sb-arrow"></span></div></button>'
            },
            notif_widget: function(text) {
                return `<div class="notify-widget-pane" style="position: absolute; width: 400px;"><div class="notify-widget-pane hid" style=""><div class="oz-notify-pane center-text"><div class="oz-inline-block"><div class="ls"></div><div class="notify-text">${text}</div><div class="ks"></div></div></div></div></div>`;
            },
            iframe_wrapper: '<div id="sb-wrapper sharebox-container"><div id="sb-container" class="sb-card sb-off sb-cont"><div class="sb-card-body-arrow"></div><div class="sb-card-border"><div class="sb-card-body-arrow"></div><div class="sb-card-content" style="width:unset" id="sb-target"><div class="sb-notification-frame"><div class="notify-widget-pane" style="position: absolute; width: 400px;"><div class="notify-widget-pane hid" style=""><div class="oz-notify-pane center-text"><div class="oz-inline-block"><div class="ls"></div><div class="notify-text"><span class="run run-text">Loading...</span></div><div class="ks"></div></div></div></div></div></div></div></div></div><div id="sb-onepick-target" class="sb-off"></div></div>',
            css: '#yt-share-sb-parent{display:inline-block;line-height:27px;vertical-align:top}#yt-share-sb,#yt-share-sb-parent{position:relative;padding:0 10px}#yt-share-sb{background-color:#f8f8f8;background-image:linear-gradient(#f8f8f8,#ececec);border:1px solid #c6c6c6;border-radius:2px}#yt-share-sb:hover{background:linear-gradient(#fff,#ececec);border:1px solid #bbb}#yt-share-sb:active{background:linear-gradient(to bottom,#fff,#ececec);border:1px solid #b6b6b6;box-shadow:inset 0 1px 2px rgba(0,0,0,.2)}#yt-share-sb-plus{background-position:-163px 0;height:10px;opacity:.8;left:10px}#yt-share-sb-comp{display:inline-block;width:18px}#yt-share-sb-title{zoom:1;color:#666}#yt-share-sb-arrow{background-position:-163px -15px;height:11px;left:100%}#yt-share-sb-arrow,#yt-share-sb-plus{background-image:url(//ssl.gstatic.com/gb/images/k1_a31af7ac.png);background-size:294px 45px;position:absolute;top:8px;width:10px}.sb-card:not(.sb-cont){right:138px !important;}[id*="sharebox-container"]{z-index:1100010;position:relative;min-width: 1003px;width: auto !important;}.sharebox-container {padding: 35px 20px 20px;background-color: #f5f5f5;}.sharebox-container .sharebox-main {position: relative;background-color: #f5f5f5;max-width: 540px;font-size: 13px;}.sharebox-container .sharebox-main .distiller_yt-sb-container {min-height: 62px;}.sharebox-container .sharebox-main .distiller_yt-sb-standin .box {padding-bottom: 18px;}.sharebox-container .sharebox-main .distiller_yt-sb-standin .body {padding: 0;}.sharebox-container .sharebox-main .distiller_yt-sb {margin: 0 0;}.sharebox-container .sharebox-main .distiller_yt-sb .sb_text_input {margin-left: unset;}.sharebox-container .sharebox-main .distiller_yt-sb .oz-comment_post-dismiss {top: 8px;}.sharebox-container .sharebox-main .distiller_yt-sb .body {padding: 0;}.sharebox-container .sharebox-main .sb_text_input, .sharebox-container .sharebox-main .box.focus_caller {box-shadow: inset 0 2px 4px 0 rgba(0,0,0,0.04);border: 1px solid #e4e4e4;}.sharebox-container .sharebox-main .sb_text_input:hover, .sharebox-container .sharebox-main .box.focus_caller:hover, .sharebox-container .sharebox-main .sb_text_input:focus, .sharebox-container .sharebox-main .box.focus_caller:focus {border: 1px solid #dcdcdc;box-shadow: inset 0 2px 4px 0 rgba(0,0,0,0.04);}.sharebox-container .sharebox-main .sharebox-action-container {font-family: Roboto;margin-top: 10px;}.sharebox-container .sharebox-main .sharebox-action-container .photo-drag-container {position: relative;background: #e5e5e5;border: 1px solid #ddd;border-radius: 2px;padding: 100px 0;text-align: center;font-size: 20px;user-select: none;margin-bottom: 10px;color: #909090;}.sharebox-container .sharebox-main .sharebox-action-container .photo-drag-container .drag-image-icon {margin: auto;}.sharebox-container .sharebox-main .sharebox-action-container .photos-buttons .jfk-button {width: 98.6%;padding: 2px;}.sharebox-container .sharebox-main .sharebox-controls {max-width: 600px;padding-top: 5px;}.sharebox-container .sharebox-main .sharebox-controls .buttons {white-space: nowrap;}.sharebox-container .sharebox-main .sharebox-controls .buttons button {margin-right: 8px;}.sharebox-container .sharebox-main .backstage-posted-indicator, .sharebox-container .sharebox-main .error-indicator {position: relative;top: 7px;margin-left: 6px;text-overflow: ellipsis;overflow: hidden;width: 160px;white-space: nowrap;display: block;}.sharebox-container .sharebox-main .error-indicator {color: #940000;}.sharebox-container .sharebox-main .sharebox-links {padding-top: 10px;}.sharebox-container .sharebox-main .sharebox-links-container {display: block;padding-top: 3px;width: 440px;}.sharebox-container .sharebox-main .sharebox-links .sharebox-toolbar {display: table;}.sharebox-container .sharebox-main .sharebox-links .sharebox-toolbar span[role="button"] {color: #737373;cursor: pointer;display: table-cell;font-size: 12px;font-weight: bold;padding-right: 30px;}.sharebox-container .sharebox-main .sharebox-links .sharebox-toolbar span[role="button"]:hover {color: #404040;text-decoration: none;}.sharebox-container .sharebox-main .sharebox-links .sharebox-toolbar span[role="button"] .title {display: table-cell;padding-left: 6px;vertical-align: middle;}.sharebox-container .sharebox-main .sharebox-links .sharebox-toolbar-icon {margin: 8px 10px 6px;display: table-cell;}.sharebox-container .oz-inline {display: inline-block;}.oz-photos-icon {background: no-repeat url("//ssl.gstatic.com/s2/tt/images/sharebox/sharebox-70700447eb53cc22b3ebf7cf6ffc71d7.png") 0 -558px;height: 20px;width: 20px;}.oz-link-icon {background: no-repeat url("//ssl.gstatic.com/s2/tt/images/sharebox/sharebox-70700447eb53cc22b3ebf7cf6ffc71d7.png") 0 -790px;height: 20px;width: 20px;}.oz-video-icon {background: no-repeat url("//ssl.gstatic.com/s2/tt/images/sharebox/sharebox-70700447eb53cc22b3ebf7cf6ffc71d7.png") 0 -264px;height: 20px;width: 20px;}.oz-event-icon {background: no-repeat url("//ssl.gstatic.com/s2/tt/images/sharebox/sharebox-70700447eb53cc22b3ebf7cf6ffc71d7.png") 0 -193px;height: 20px;width: 20px;}.oz-poll-icon {background: no-repeat url("//ssl.gstatic.com/s2/tt/images/sharebox/sharebox-70700447eb53cc22b3ebf7cf6ffc71d7.png") 0 -310px;height: 20px;width: 20px;}.drag-image-icon {background: no-repeat url("//ssl.gstatic.com/s2/oz/images/sprites/sharebox_simple_photo-9a6fe78f09124ebf6240131f07c5dd15.png") -180px 0px;height: 64px;width: 64px;}'
        }
    }

    // create css
    var css = document.createElement('style');
    css.innerHTML = sbutils.template.css;
    css.setAttribute("class", "v3");
    document.head.appendChild(css);

    // create share button
    sbutils.waitForElm('#sb-button-notify').then((elm) => {
        var init = 0;
        document.querySelector('#sb-button-notify').insertAdjacentHTML('afterend',sbutils.template.share.button);
        document.querySelector('#yt-masthead-container').insertAdjacentHTML('beforebegin',sbutils.template.iframe_wrapper);
        sbutils.waitForElm('#yt-share-sb').then((elm) => {
            document.querySelector('#yt-share-sb').onclick = function() {
                init++;
                function toggle_wrapper() {
                    var iframe_wrapper = document.querySelector('[id*="sharebox-container"]');
                    if (iframe_wrapper.querySelector('#sb-container.sb-cont').classList.contains('sb-off')) {
                        iframe_wrapper.querySelector('#sb-container.sb-cont').classList.remove('sb-off');
                        iframe_wrapper.querySelector('#sb-container.sb-cont').classList.add('sb-on');
                    } else {
                        iframe_wrapper.querySelector('#sb-container.sb-cont').classList.remove('sb-on');
                        iframe_wrapper.querySelector('#sb-container.sb-cont').classList.add('sb-off');
                        if (document.querySelector('.backstage-posted-indicator')) {
                            document.querySelector('.backstage-posted-indicator').remove();
                        }
                    }
                }
                toggle_wrapper();
                if (init == 1) {
                    document.querySelector('[id*="sharebox-container"] .sb-notification-frame').innerHTML = `<div class="sharebox-container"><div class="sharebox-main">${sbutils.template.share.box}<div class="sharebox-links"><div class="oz-inline"><div class="sharebox-links-container"><div class="sharebox-toolbar"><span role="button"><div class="sharebox-toolbar-icon oz-photos-icon"></div><div class="title">Photos</div></span><span role="button"><div class="sharebox-toolbar-icon oz-link-icon"></div><div class="title">Link</div></span><span role="button"><div class="sharebox-toolbar-icon oz-video-icon"></div><div class="title">Video</div></span><span role="button"><div class="sharebox-toolbar-icon oz-poll-icon"></div><div class="title">Poll</div></span></div></div></div></div><div class="sharebox-controls"><table border="0" cellpadding="0" cellspacing="0"><tbody><tr><td valign="top" class="buttons"><button class="jfk-button goog-inline-block jfk-button-default" id="share" disabled><span class="jfk-button-text"><span class="run">Share</span></span></button><button class="jfk-button goog-inline-block jfk-button-standard" id="cancel"><span class="jfk-button-text"><span class="run">Cancel</span></span></button></td><td width="100%"></td></tr></tbody></table></div></div></div>`;
                    sbutils.waitForElm('[id*="sharebox-container"] ').then((elm) => {
                        elm.querySelector('.sb_text_input').oninput = function() {
                            if (!elm.querySelector('.sb_text_input').textContent == '') {
                                document.querySelector('[id*="sharebox-container"] #share').removeAttribute('disabled');
                            } else {
                                document.querySelector('[id*="sharebox-container"] #share').setAttribute("disabled");
                            }
                        }
                        document.querySelector('[id*="sharebox-container"] #cancel').onclick = function() {
                            toggle_wrapper();
                            elm.querySelector('.sb_text_input').textContent = '';
                            if (!elm.querySelector('.distiller_yt-sb').classList.contains('hid')) {
                                elm.querySelector('.distiller_yt-sb').classList.add('hid');
                            }
                        }
                        document.querySelector('[id*="sharebox-container"] #share').onclick = function() {
                            if(!document.querySelector('[id*="sharebox-container"] #share').getAttributeNames().includes('disabled')) {
                                document.querySelector('[id*="sharebox-container"] #share').innerText = 'Sharing...';
                                document.querySelector('[id*="sharebox-container"] #share').setAttribute("disabled");
                                sbutils.ajax.getaccountswitcherendpoint().then(accountdata => {
                                    var popup = accountdata.data.actions[0].getMultiPageMenuAction.menu.multiPageMenuRenderer.sections[0].accountSectionListRenderer;
                                    var accountItem = popup.contents[0].accountItemSectionRenderer.contents.find(a => a.accountItem.isSelected == true)?.accountItem;
                                    var ucid = 'UC'+accountItem.serviceEndpoint.selectActiveIdentityEndpoint.supportedTokens[1].offlineCacheKeyToken.clientCacheKey;
                                    sbutils.ajax.innertuberequest('//www.youtube.com/youtubei/v1/backstage/create_post?prettyPrint=false',`"createBackstagePostParams":"${sbutils.encodeucid(ucid)}","commentText":"${elm.querySelector('.sb_text_input').innerText}"`,yt.config_.INNERTUBE_CLIENT_NAME,yt.config_.INNERTUBE_CLIENT_VERSION).then(backstagedata => {
                                        document.querySelector('[id*="sharebox-container"] #share').removeAttribute('disabled');
                                        document.querySelector('[id*="sharebox-container"] #share').innerText = 'Share';
                                        console.log(backstagedata);
                                        document.querySelector('.sharebox-controls td[width="100%"]').innerHTML = `<a href="/post/${backstagedata.actions[0].runAttestationCommand.ids[0].externalPostId}" class="backstage-posted-indicator">View post</a>`;
                                    }).catch((error) => {
                                        document.querySelector('.sharebox-controls td[width="100%"]').innerHTML = `<span class="error-indicator">${error}</span>`;
                                        document.querySelector('[id*="sharebox-container"] #share').removeAttribute('disabled');
                                        document.querySelector('[id*="sharebox-container"] #share').innerText = 'Share';
                                        console.error(error);
                                    });
                                }).catch((error) => {
                                    document.querySelector('.sharebox-controls td[width="100%"]').innerHTML = `<span class="error-indicator">${error}</span>`;
                                    document.querySelector('[id*="sharebox-container"] #share').removeAttribute('disabled');
                                    document.querySelector('[id*="sharebox-container"] #share').innerText = 'Share';
                                    console.error(error);
                                });
                            }
                        }
                    });
                }
            }
        });
    });
})();
