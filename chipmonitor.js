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

    var SERIAL = parseInt(Math.random() * 100000000000000000, 10);
    var ORIGIN = options.origin ? options.origin : window.location.hostname;
    var ext = window.location.search.match(/(?:originext=)([A-Za-z0-9_-]+)/g);
    if (ext) {
        ORIGIN += '-'+ext[0].split('=')[1];
    }

    var BATCH = options.version;
    var SENDDELAY = options.sendDelay ? options.sendDelay : 1 * 60 * 1000;
    var CHIPSERVICE = options.chipService;

    var debugMode = options.debug;
    var identifierParser = options.findElementIdentifier ? options.findElementIdentifier : findElementIdentifier;
    console.log("Chip monitor is up:", ORIGIN, BATCH, SENDDELAY, CHIPSERVICE)
    var actions = [];
    var timeoutObj;

    document.addEventListener('click', clickHandler, true);
    function clickHandler(e) {
        var key = identifierParser(e.target);
        if (!key) {
            if (debugMode) console.log('no key target', e.target);
            return;
        }
        if (debugMode) console.log('push action:', key);
        actions.push([new Date().getTime(), key.trim()]);
        resetSendDelay();
    };

    function resetSendDelay() {
        if (timeoutObj) clearTimeout(timeoutObj);
        timeoutObj = setTimeout(function () {
            sendToChipServer();
        }, SENDDELAY);
    };

    function sendToChipServer() {
        var timestamp = new Date().getTime();
        xhr = new XMLHttpRequest();
        xhr.open("POST", CHIPSERVICE, true);
        xhr.setRequestHeader("Content-type", "text/plain");
        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) return;
            if (xhr.status == 200) {
                resetActions(timestamp);
            } else {
                console.log("Chip server seems not availible. Disable ChipMonitor funciton.", xhr.status, new Date());
                stopMonitor();
            }
        }

        var data = JSON.stringify({
            origin: ORIGIN,
            batch: BATCH,
            serial: SERIAL,
            ingredients: actions
        });
        xhr.send(data);
    };

    function resetActions(timestamp) {
        var keep = [];
        for (var i = actions.length - 1; i > 0 && i < actions.length; i--) {
            var time = actions[i][0];
            if (timestamp > time) {
                actions = actions.slice(i);
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
            }
        }


        if (ele.tagName === 'TEXTAREA' || ele.tagName === 'INPUT') {
            return ele.name;
        }

        var closest = ele.closest(selector);
        if (closest) {
            identifier = getElementIdentifier(closest);
            if (identifier) return identifier;
        }

        return 'uncaught-identifier-' + ele.className;
    }

    function getElementIndex(node) {
        var i = 1;
        while (node = (node.previousElementSibling || node.previousSibling)) { ++i }
        return i;
    }

    function stopMonitor() {
        document.removeEventListener('click', clickHandler)
        if (timeoutObj) clearTimeout(timeoutObj);
    }
}

