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

    saveLocalStorageData();

    var actions = [];
    var timeoutObj;
    window.__chipClick = clickHandler;
    document.addEventListener('click', window.__chipClick, true);

    window.addEventListener("beforeunload", function (e) {
        if (actions.length>0) writeToLocalStorage();
    }, true);
    
    function clickHandler(e) {
        var key = identifierParser(e.target);
        if (!key) {
            if (debugMode) console.log('no key target', e.target);
            return;
        }
        if (debugMode) console.log('push action:', key);
        actions.push([new Date().getTime(), key.trim(), [Math.round(e.clientX), Math.round(e.clientY)],[Math.round(e.offsetX), Math.round(e.offsetY)]]);
        resetSendDelay();
    };

    function resetSendDelay() {
        if (timeoutObj) clearTimeout(timeoutObj);
        timeoutObj = setTimeout(function () {
            sendToChipServer(ORIGIN, BATCH, SERIAL, actions);
        }, SENDDELAY);
    };

    function sendToChipServer(org, bch, sri, acts, localstorage) {
        var timestamp = new Date().getTime();
        xhr = new XMLHttpRequest();
        xhr.open("POST", CHIPSERVICE, true);
        xhr.setRequestHeader("Content-type", "text/plain");
        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) return;
            if (xhr.status == 200) {
                resetActions(timestamp, acts);
            } else {
                console.log("Chip server seems not availible. Disable ChipMonitor funciton.", xhr.status, new Date());
                stopMonitor();
            }
        }

        var data = {
            origin: org,
            batch: bch,
            serial: sri,
            ingredients: acts
        }
        
        if (localstorage) {
            data.ls = 1;
        }
        data = JSON.stringify(data);
        xhr.send(data);
        console.log("sendToChipServer", data)
    };

    function saveLocalStorageData(){
        if (localStorage.chipData) {
            var d = JSON.parse(localStorage.chipData);
            sendToChipServer(d.origin, d.batch, d.serial, d.ingredients, true);
            localStorage.removeItem("chipData");
        }
    }

    function writeToLocalStorage(){
        var data = JSON.stringify({
            origin: ORIGIN,
            batch: BATCH,
            serial: SERIAL,
            ingredients: actions
        });

        localStorage.chipData = data;
    }

    function resetActions(timestamp, acts) {
        var keep = [];
        for (var i = acts.length - 1; i > 0 && i < acts.length; i--) {
            var time = acts[i][0];
            if (timestamp > time) {
                acts = acts.slice(i);
                return;
            }
        }
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

        return 'uncaught-identifier-' + ele.className;
    }

    function getElementIndex(node) {
        var i = 1;
        while (node = (node.previousElementSibling || node.previousSibling)) { ++i }
        return i;
    }

    function stopMonitor() {
        document.removeEventListener('click', window.__chipClick, true)
        if (timeoutObj) clearTimeout(timeoutObj);
        console.log("Stopped monitor!")
    }
}

