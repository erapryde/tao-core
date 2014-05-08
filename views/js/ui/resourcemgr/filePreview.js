define([
'jquery',
'lodash',
'ui/previewer'],
function($, _){
    'use strict';

    var ns = 'resourcemgr';

    /**
     * Get Human Readable Size
     * @param {Number} bytes - the number of bytes
     * @returns {String} the size converted
     */
    function hrSize(bytes) {
        
        var units = ['B', 'kB','MB','GB','TB'];
        var unit = 0;
        var thresh = 1024; 
        bytes = bytes || 0;
        while(bytes >=thresh) {
            bytes /= thresh;
            unit++;
        }
        return bytes.toFixed(2) + ' ' + units[unit];
    }

    return function(options, path){
        
        var $container      = options.$target;
        var $filePreview    = $('.file-preview', $container);
        var $previewer      = $('.previewer', $container);
        var $propType       = $('.prop-type', $filePreview); 
        var $propSize       = $('.prop-size', $filePreview); 
        var $propUrl        = $('.prop-url', $filePreview); 
        var $selectButton   = $('.select-action', $filePreview);
        var currentSelection= [];


        $container.on('fileselect.' + ns, function(e, file){
            if(file && file.file){
                $propType.text(file.type + ' (' + file.mime + ')'); 
                $propSize.text(hrSize(file.size)); 
                $propUrl.html('<a href="' + file.url + '">' + file.file + '</a>'); 

                currentSelection = [file.path];
                $selectButton.removeAttr('disabled');
            } else {
                $propType.empty(); 
                $propSize.empty(); 
                $propUrl.empty(); 
                $selectButton.attr('disabled', 'disabled');
            }
            startPreview(file);
        });

        $selectButton.on('click', function(e){
            e.preventDefault();
            $container.trigger('select.' + ns, [currentSelection]);
        });

        function startPreview(file){
            $previewer.previewer(file);
        }
    };
});