/**
<script type="text/javascript" src="https://raw.githack.com/coolinker/chips/master/chipmonitor.js"></script>
<script type="text/javascript">
    ChipMonitor({version:'2.2.101', sendDelay:30000,chipService:'http://10.37.10.211:8080/chips', debug:true});
</script> 
 */

function ChipMonitor(options) {
    if (options.stop) {
        stopMonitor();
        return;
    }

    if (!Element.prototype.matches) Element.prototype.matches = Element.prototype.msMatchesSelector;
    if (!Element.prototype.closest) Element.prototype.closest = function (selector) {
        var el = this;
        while (el) {
            if (el.matches(selector)) {
                return el;
            }
            el = el.parentElement;
        }
    }

    var SERIAL = parseInt(Math.random() * 100000000000000000, 10);
    var ORIGIN = options.origin ? options.origin : window.location.hostname;
    var ext = window.location.search.match(/(?:originext=)([A-Za-z0-9_-]+)/g);
    if (ext) {
        ORIGIN += '-' + ext[0].split('=')[1];
    }

    var BATCH = options.version;
    var SENDDELAY = options.sendDelay ? options.sendDelay : 1 * 60 * 1000;
    var CHIPSERVICE = options.chipService;

    var debugParam = window.location.search.match(/(?:chipdebug=)([A-Za-z0-9_-]+)/g);
    debugParam = debugParam ? debugParam[0].split('=')[1] : null;
    var debugMode = debugParam ? debugParam === 'true' : options.debug;
    var identifierParser = options.findElementIdentifier ? options.findElementIdentifier : findElementIdentifier;
    console.log("Chip monitor is up:", ORIGIN, BATCH, SENDDELAY, CHIPSERVICE)

    var actions = [];

    saveLocalStorageData();

    actions.push([new Date().getTime(), "browser.loaded", [0, 0], "loaded"]);

    var timeoutObj;
    window.__chipActionHandler = actionHandler;
    window.addEventListener("beforeunload", window.__chipActionHandler, true);
    window.addEventListener('click', window.__chipActionHandler, true);
    window.addEventListener("touchstart", window.__chipActionHandler, true);
    window.addEventListener("touchend", window.__chipActionHandler, true);

    window.__chipKeydownHandler = function (e) {
        var focusinhandler = function (e) {
            window.removeEventListener("focusin", focusinhandler, true);
            var pos = getPosition(e.target);
            e.clientX = pos.x;
            e.clientY = pos.y;
            actionHandler(e);
        }

        if (e.keyCode === 9/*tab*/) {
            window.addEventListener("focusin", focusinhandler, true);
        }
    }

    window.addEventListener("keydown", window.__chipKeydownHandler, true);



    function actionHandler(e) {
        var key;

        if (e.type === 'beforeunload') {
            key = 'beforeunload';
        } else if (e.type === 'touchstart' || e.type === 'touchend') {
            var t = e.changedTouches[0];
            t.type = e.type;
            e = t;
            key = identifierParser(e.target);
        } else {
            key = identifierParser(e.target);
        }

        if (!key) {
            if (debugMode) console.log('no key target', e.target);
            return;
        }

        if (debugMode) console.log('push action:', e.type, key);
        var len = actions.length;
        if (e.type === 'click' && len >= 2 && actions[len - 1][3] === 'touchend' && actions[len - 2][3] === 'touchstart') {
            actions.pop();
            //replace touchstart/touchend by tclick
            actions[len - 2][3] = 'tap';
        } else {
            actions.push([new Date().getTime(), key.trim(), [Math.round(e.clientX), Math.round(e.clientY)], e.type]);
        }

        if (localStorage.chipData) {
            localStorage.removeItem("chipData");
        }

        resetSendDelay();

        if (e.type === 'beforeunload') {
            writeToLocalStorage();
        }

    };

    function resetSendDelay() {
        if (timeoutObj) clearTimeout(timeoutObj);
        timeoutObj = setTimeout(function () {
            sendToChipServer(ORIGIN, BATCH, SERIAL);
        }, SENDDELAY);
    };

    function sendToChipServer(org, bch, sri, localstorage) {
        var timestamp = new Date().getTime();
        xhr = new XMLHttpRequest();
        xhr.open("POST", CHIPSERVICE, true);
        xhr.setRequestHeader("Content-type", "text/plain");
        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) return;
            if (xhr.status == 200) {

            } else {
                console.log("Chip server seems not availible. Disable ChipMonitor funciton.", xhr.status, new Date());
                stopMonitor();
            }
        }

        var data = {
            origin: org,
            batch: bch,
            serial: sri,
            ingredients: actions
        }

        if (localstorage) {
            data.ls = 1;
        }
        data = JSON.stringify(data);
        xhr.send(data);
        resetActions();

        if (debugMode) {
            console.log("sendToChipServer", data)
        }
    };

    function saveLocalStorageData() {
        if (localStorage.chipData) {
            var d = JSON.parse(localStorage.chipData);
            actions = d.ingredients;
            if (new Date() - actions[actions.length - 1][0] > SENDDELAY) {
                var fromLocalStorage = true;
                sendToChipServer(d.origin, d.batch, d.serial, fromLocalStorage);
            } else {
                resetSendDelay();
                // console.log("continue after reloading...")
            }

            localStorage.removeItem("chipData");
        }
    }

    function writeToLocalStorage() {
        var data = JSON.stringify({
            origin: ORIGIN,
            batch: BATCH,
            serial: SERIAL,
            ingredients: actions
        });

        localStorage.chipData = data;
    }

    function resetActions() {
        actions.length = 0;
    };

    function getElementIdentifier(ele) {
        if (!ele) return;
        var regex = /(^(rui|ow(?!-autoDir)|cal|automation)| (rui|ow(?!-autoDir)|cal|automation))[^ ]*/g;
        var cls = ele.className;
        var selected;
        var identifier;
        if (selected = cls.match(regex)) {
            identifier = selected.join();
        } else if (cls.match(/x-form-date-trigger/g)) {
            identifier = 'x-form-date-trigger';
        } else if (cls.match(/x-boundlist/g)) {
            identifier = cls + '-' + getElementIndex(ele)
        } else if (cls.match(/rui-settings-list-desc automation-settings-list-desc/g)) {
            identifier = cls + '-' + e.textContent;
        } else if (cls.match(/x-button-label/g)) {
            identifier = cls + '-' + e.textContent;
        }

        return identifier;
    }

    function findElementIdentifier(ele) {
        var identifier = getElementIdentifier(ele);
        if (identifier) return identifier;
        var regex = /(^(rui|ow(?!-autoDir)|cal|automation)| (rui|ow(?!-autoDir)|cal|automation))[^ ]*/g;
        var selector = '[class^=rui-],[class*=" rui-"],:not([class=ow-autoDir])[class^=ow-],[class*=" ow-"],[class^=cal-],[class*=" cal-"],[class^=automation-],[class*=" automation-"]';

        var ancestor = ele.closest('.x-grid-row, .x-menu-item, .x-form-checkbox, .x-message-box, .x-btn, .rui-cal-picker, .rui-calist-datalist, .cal-list-evt, .rui-cal-evt-tbl-title, .rui-cal-ev, .rui-settings-list, .rui-pab-entry-alphabet-strip-item, .x-datepicker-cell')
        if (ancestor) {
            var acls = ancestor.className;
            if (acls.indexOf('x-message-box') > -1) {
                var previousSibling = ele.previousSibling;
                var text = previousSibling.textContent;
                return 'x-message-box-' + text;
            } else if (acls.indexOf('x-grid-row') > -1) {
                var rowidt, folderele;
                if (folderele = ancestor.querySelector('.ow-icon-mail-folderConlumn-inner')) rowidt = folderele.className;
                else if (folderele = ancestor.querySelector('.ow-addressbook-name')) rowidt = folderele.className;
                if (rowidt) return rowidt;

                if (ancestor.querySelector('[class*=mail]')) rowidt = 'x-grid-row-mail';
                else if (ancestor.querySelector('[class*=contact]')) rowidt = 'x-grid-row-contact';

                if (ele.querySelector('[class*=checker]') || ele.className.indexOf('-checker') > -1) {
                    rowidt += '-checker';
                }
                return rowidt;
            } else if (acls.indexOf("x-menu-item") > -1) {
                selected = acls.match(regex);
                if (selected) return selected.join() + '-' + getElementIndex(ancestor);
                return 'x-menu-item-' + getElementIndex(ancestor);
            } else if (acls.match(/x-btn/g)) {
                var btnid = getElementIdentifier(ancestor);
                if (btnid) return btnid + '-' + ancestor.textContent;
                var xbox = ancestor.closest('.x-message-box');
                if (xbox) {
                    return 'x-message-box-' + ancestor.textContent;
                }
                var xwin = ancestor.closest('.x-window');
                if (xwin) {
                    return 'x-window-' + getElementIdentifier(xwin) + ancestor.textContent;
                }
                btnid = getElementIdentifier(ancestor.querySelector(selector));
                if (btnid) return btnid + ancestor.textContent;
            } else if (acls.match(/x-form-checkbox/g)) {
                return 'x-form-checkbox';
            } else if (acls.match(/rui-cal-ev/g)) {
                return 'rui-cal-ev';
            }
        }


        var closest = ele.closest(selector);
        if (closest) {
            identifier = getElementIdentifier(closest);
            if (identifier) return identifier;
        }

        if (ele.tagName === 'TEXTAREA' || ele.tagName === 'INPUT') {
            return ele.name;
        }
        
        if (ele.id === 'inner-editor') {
            return ele.id;
        }

        return 'uncaught-identifier-' + ele.className;
    }

    function getElementIndex(node) {
        var i = 1;
        while (node = (node.previousElementSibling || node.previousSibling)) { ++i }
        return i;
    }

    function getPosition(el) {
        var xPos = 0;
        var yPos = 0;

        while (el) {
            if (el.tagName == "BODY") {
                // deal with browser quirks with body/window/document and page scroll
                var xScroll = el.scrollLeft || document.documentElement.scrollLeft;
                var yScroll = el.scrollTop || document.documentElement.scrollTop;

                xPos += (el.offsetLeft - xScroll + el.clientLeft);
                yPos += (el.offsetTop - yScroll + el.clientTop);
            } else {
                // for all other non-BODY elements
                xPos += (el.offsetLeft - el.scrollLeft + el.clientLeft);
                yPos += (el.offsetTop - el.scrollTop + el.clientTop);
            }

            el = el.offsetParent;
        }
        return {
            x: xPos,
            y: yPos
        };
    }

    function stopMonitor() {
        window.removeEventListener('click', window.__chipActionHandler, true)
        window.removeEventListener("beforeunload", window.__chipActionHandler, true);
        window.removeEventListener("touchstart", window.__chipActionHandler, true);
        window.removeEventListener("touchend", window.__chipActionHandler, true);
        window.removeEventListener("keydown", window.__chipKeydownHandler, true);

        if (timeoutObj) clearTimeout(timeoutObj);
        console.log("Stopped monitor!")
    }
}

