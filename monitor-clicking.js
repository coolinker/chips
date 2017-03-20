document.addEventListener('click', function(e){
    function getOwnClassName(ancestor){
        debugger
        var ownClassName = [];
        var ancestorClassName = ancestor.classList;
        for(var k = 0; k < ancestorClassName.length; k ++){
            if((ancestorClassName[k].startsWith('rui') || ancestorClassName[k].startsWith('ow')|| ancestorClassName[k].startsWith('cal') 
                || ancestorClassName[k].startsWith('automation'))&& ancestorClassName[k] !== 'ow-autoDir'){
                ownClassName.push(ancestorClassName[k]);
            }
        }
        if(ownClassName.length >= 1){
            return ownClassName;
        }

        var children = ancestor.childNodes;
        if(children.length === 0){
            return ownClassName;
        }
        for(var i = 0 ; i < children.length; i ++){
            if(children[i].nodeType === 3){
                return ownClassName;
            }
            var childClassList = children[i].classList;
            for(var j = 0; j < childClassList.length; j ++){
                if((childClassList[j].startsWith('rui') || childClassList[j].startsWith('ow') || childClassList[j].startsWith('cal') 
                    || childClassList[j].startsWith('automation')) && childClassList[j] !== 'ow-autoDir'){
                    ownClassName.push(childClassList[j]);
                }
            }

            if(ownClassName.length >= 1){
                return ownClassName;
            }
            else{
                ownClassName = getOwnClassName(children[i]);
            }
        }
        return ownClassName;
    }


    
    var classname,ancestor,ancestorText,text,id;

     classname = getOwnClassName(e.target);
     if(classname.length === 0){

        if(e.target.closest('.rui-cal-picker')){
            classname = '.rui-cal-picker';
            ancestor = e.target.closest('.rui-cal-picker');
        } else if(e.target.closest('.rui-calist-datalist')){
            ancestor = e.target.closest('.rui-calist-datalist');
            classname = '.rui-calist-datalist';

        } else if(e.target.closest('.cal-list-evt')){
            ancestor = e.target.closest('.cal-list-evt');
            classname = '.cal-list-evt';

        } else if(e.target.closest('.rui-cal-evt-tbl-title')){
            ancestor = e.target.closest('.rui-cal-evt-tbl-title');
            classname = '.rui-cal-evt-tbl-title';

        } else if(e.target.closest('.rui-cal-ev')){
            ancestor = e.target.closest('.rui-cal-ev');
            classname = '.rui-cal-ev';

        } else if(e.target.closest('.rui-settings-list')){
            ancestor = e.target.closest('.rui-settings-list');
            classname = '.rui-settings-list';

        } else if(e.target.closest('.rui-pab-entry-alphabet-strip-item')){
            ancestor = e.target.closest('.rui-pab-entry-alphabet-strip-item');
            classname = '.rui-pab-entry-alphabet-strip-item';

        }  else if (e.target.className.contains('x-form-date-trigger')){
            classname = 'x-form-data-trigger';
            ancestor = e.target;

        } else if(e.target.className.contains('x-trigger-index-0')){
            var parentNode = e.target.parentNode;
            var previousSibling = parentNode.previousSibling;
            classname = getOwnClassName(previousSibling);
        } else if(e.target.className.contains('x-grid-row-checker')){
            classname = 'x-grid-row-checker';
        } else if(e.target.closest('.x-message-box')){
        ancestor = e.target.closest('.x-message-box');
        classname = '.x-message-box';
        if(!text){
            var previousSibling = e.target.previousSibling;
            text = previousSibling.innerText || previousSibling.textContent;
        }

        } else if(e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT'){
            ancestor = e.target;
            classname = getOwnClassName(ancestor);
            var name = ancestor.name;
        } else {
            if(e.target.closest('.x-btn')){
                ancestor = e.target.closest('.x-btn');
            } else if(e.target.closest('.x-grid-cell')){
                ancestor = e.target.closest('.x-grid-cell');
            } else if(e.target.closest('.x-menu-item')){
                ancestor = e.target.closest('.x-menu-item'); 
            } else if(e.target.closest('.x-form-checkbox')){
                ancestor = e.target.closest('.x-form-checkbox'); 
            }
            
            if(ancestor){
                classname = getOwnClassName(ancestor);
            }
        }
    }
    if(!text){
        text = e.target.innerText || e.target.outerText ||e.target.textContent;
        if(ancestor){
            ancestorText = ancestor.innerText;
            text = text || ancestorText;
        }
    }

    console.info(e.target);
    console.log(ancestor);
    console.log('classname: ' + classname + '. text: ' + text + '. name: ' + name);
    
}, true);