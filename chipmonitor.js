// ChipMonitor({version:'2.2.101', sendDelay:10000,chipService:'http://10.37.2.237:8080/chips'});
function ChipMonitor(options) {
    var SERIAL = parseInt(Math.random() * 100000000000000000, 10);
    var ORIGIN = options.origin ? options.origin : window.location.hostname;
    var BATCH = options.version;
    var SENDDELAY = options.sendDelay ? options.sendDelay : 1 * 60 * 1000;
    var CHIPSERVICE = options.chipService;
    var debugMode = options.debug;
    var objectParser = options.objectParser ? options.objectParser : defaultObjectParser;
    console.log("Chip monitor is up:", ORIGIN, BATCH, SENDDELAY, CHIPSERVICE)
    var actions = [];
    var timeoutObj;

    document.addEventListener('click', clickHandler, true);

    function clickHandler(e) {
        var info = objectParser(e);
        actions.push([new Date().getTime(), info.key, info]);
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
                //console.log('Chipservice done', xhr.responseText)
                resetActions(timestamp);
            } else {
                console.log("Chip server seems not availible. Disable ChipMonitor funciton.", xhr.status, new Date());
                document.removeEventListener('click', clickHandler)
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

    function defaultObjectParser(e) {
        var classname, ancestor, ancestorText, text, name;
        classname = classnameParser(e.target);
        if (debugMode) console.log('defaultObjectParser', e.target);

        if (classname.length === 0) {
            if (ancestor = e.target.closest('.rui-cal-picker')) {
                classname = '.rui-cal-picker';
            } else if (ancestor = e.target.closest('.rui-calist-datalist')) {
                classname = '.rui-calist-datalist';
            } else if (ancestor = e.target.closest('.cal-list-evt')) {
                classname = '.cal-list-evt';
            } else if (ancestor = e.target.closest('.rui-cal-evt-tbl-title')) {
                classname = '.rui-cal-evt-tbl-title';
            } else if (ancestor = e.target.closest('.rui-cal-ev')) {
                classname = '.rui-cal-ev';
            } else if (ancestor = e.target.closest('.rui-settings-list')) {
                classname = '.rui-settings-list';
            } else if (ancestor = e.target.closest('.rui-pab-entry-alphabet-strip-item')) {
                classname = '.rui-pab-entry-alphabet-strip-item';
            } else if (e.target.className.contains('x-form-date-trigger')) {
                classname = 'x-form-data-trigger';
                ancestor = e.target;
            } else if (e.target.className.contains('x-trigger-index-0')) {
                var parentNode = e.target.parentNode;
                var previousSibling = parentNode.previousSibling;
                classname = classnameParser(previousSibling);
            } else if (e.target.className.contains('x-grid-row-checker')) {
                classname = 'x-grid-row-checker';
            } else if (ancestor = e.target.closest('.x-datepicker-cell')) {
                classname = 'x-datepicker-cell';
            } else if (ancestor = e.target.closest('.x-message-box')) {
                classname = 'x-message-box';
                if (!text) {
                    var previousSibling = e.target.previousSibling;
                    text = previousSibling.innerText || previousSibling.textContent;
                }
            } else if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') {
                ancestor = e.target;
                classname = classnameParser(ancestor);
                name = ancestor.name;
            } else if ((ancestor = e.target.closest('.x-btn'))
                || (ancestor = e.target.closest('.x-grid-cell'))
                || (ancestor = e.target.closest('.x-menu-item'))
                || (ancestor = e.target.closest('.x-form-checkbox'))) {
                classname = classnameParser(ancestor);
            } else {
                if (debugMode) console.log('target unknown', e.target);
            }
        } else {
            if (debugMode) console.log('no classname, target unknown', e.target);
        }


        if (!text) {
            text = e.target.textContent || e.target.innerText || e.target.outerText;
            if (ancestor) {
                ancestorText = ancestor.innerText;
                text = text || ancestorText;
            }
        }

        var key = name ? name : classname.toString();
        if (key.indexOf('x-menu-item') > -1 || key.indexOf('x-boundlist') > -1 || key.indexOf('x-message-box') > -1) {
            key = key + "-" + getElementIndex(e.target);
        }
        var obj = {};
        if (key) obj.key = key;
        if (classname.length > 0) obj.classname = classname.toString();
        if (text) obj.text = text;
        if (name) obj.name = name;

        if (debugMode) console.log(obj);

        return obj;

    };

    function classnameParser(ancestor) {
        var ownClassName = [];
        var ancestorClassName = ancestor.classList;
        for (var k = 0; k < ancestorClassName.length; k++) {
            if ((ancestorClassName[k].startsWith('rui') || ancestorClassName[k].startsWith('ow') || ancestorClassName[k].startsWith('cal')
                || ancestorClassName[k].startsWith('automation') || ancestorClassName[k].startsWith('x-menu-item') || ancestorClassName[k].startsWith('x-boundlist')) && ancestorClassName[k] !== 'ow-autoDir') {
                ownClassName.push(ancestorClassName[k]);
            }
        }
        if (ownClassName.length >= 1) {
            return ownClassName;
        }

        var children = ancestor.childNodes;
        if (children.length === 0) {
            return ownClassName;
        }
        for (var i = 0; i < children.length; i++) {
            if (children[i].nodeType === 3) {
                return ownClassName;
            }
            var childClassList = children[i].classList;
            for (var j = 0; j < childClassList.length; j++) {
                if ((childClassList[j].startsWith('rui') || childClassList[j].startsWith('ow') || childClassList[j].startsWith('cal')
                    || childClassList[j].startsWith('automation')) && childClassList[j] !== 'ow-autoDir') {
                    ownClassName.push(childClassList[j]);
                }
            }

            if (ownClassName.length >= 1) {
                return ownClassName;
            }
            else {
                ownClassName = classnameParser(children[i]);
            }
        }
        return ownClassName;
    };


    function getElementIndex(node) {
        var i = 1;
        while (node = (node.previousElementSibling || node.previousSibling)) { ++i }
        return i;
    }
}

