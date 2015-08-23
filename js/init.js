(function($){
  $(function(){

     var cues = {length:0};
     var maxCueTime = -1;

     var cueTypes = {
        info  : {color:'red',  icon:'label',   image: false, long : true,  short:true},
        image : {color:'blue', icon:'image',   image: true,  long : false, short:false},
        full  : {color:'green',icon:'comment', image: true,  long : true,  short:true},
        ad    : {color:'purple',icon:'shopping_basket', image: true,  long : false,  short:true}
     };

     var provider = 'b36a2f103668f40fab6633c279215213';

     var cueTemplate = '<li class="collection-item avatar cue-{{cue}}" data-time="{{sectime}}">'+
                       '<i class="material-icons circle {{color}}">{{icon}}</i>'+
                       '<div class="cue-time">{{time}}</div>'+
                       '<div class="row">{{image}}'+
                       '<div class="cue-content col {{span}}"><span class="title">{{title}}</span>'+
                       '<p><em>{{desc_short}}</em><br>{{desc_long}}</p></div></div>'+
                       '<a href="#!" class="secondary-content"><i class="material-icons" data-time="{{sectime}}">clear</i></a>'+
                       '</li>';

     var imageTemplate = '<div class="cue-image col s2"><div class="progress"><div class="indeterminate"></div></div></div>';

     var insertCue = function (cueTime, cue, image) {
        if ( $('.cue-'+cueTime).length ){
           $('.cue-'+cueTime).replaceWith(cue);
        }else {
           if (cueTime > maxCueTime) {
              $('.cue-collection').append(cue);
              maxCueTime = cueTime;
           } else {
              var cueCollection = $('.cue-collection .collection-item');
              if( cueCollection.length ){
                 cueCollection.each(function (i, currentCue) {
                    var $currentCue = $(currentCue);
                    if ($currentCue.data('time') >  cueTime) {
                       $(cue).insertBefore($currentCue);
                       return false;
                    }
                 });
              } else {
                 $('.cue-collection').append(cue);
                 maxCueTime = cueTime;
              }
           }
        }

        if (image) {
           var onreadystatechangeHandler = function (evt) {
              var status, text, readyState;
              try {
                 readyState = evt.target.readyState;
                 text = evt.target.responseText;
                 status = evt.target.status;
              } catch(e) {
                 return;
              }
              if (readyState == 4 && status == '200' && evt.target.responseText) {
                 var response = JSON.parse(evt.target.responseText);
                 if ( response.valid ){
                    var img = $('<img />');
                    img.attr('src', response.url);
                    $('.cue-'+cueTime +' .cue-image').html(img);
                    cues[ cueTime ][ 'thumbnail' ] = cues[ cueTime ][ 'img' ] = response.url;
                 } else {
                    Materialize.toast('Error uploading the image', 3000);
                    deleteCue(cueTime);
                 }
              }
           };

            var fileInput = $('input[name="cue_image"]')[0];
            var formData = new FormData();
            formData.append('image', fileInput.files[0]);
            formData.append('provider', provider);

            var xhr = new XMLHttpRequest();
            xhr.addEventListener('readystatechange', onreadystatechangeHandler, false);
            xhr.open("POST", "file_upload", true);
            xhr.send(formData);

        }

        cues.length++;
         return true;
     };

     var deleteCue = function (cueTime) {
        delete cues[cueTime];
        $('.cue-'+cueTime).remove();
        if (cueTime == maxCueTime) {
           var maxCue = $('.cue-collection .collection-item:last-child');
           maxCueTime = maxCue.length ? maxCue.data('time') : 0;
        }

        cues.length--;
     };

     $('.cue-collection').on('click', 'li.collection-item', function(evt){

        console.log(evt.target);

        var cueTime = $(evt.target).data('time');

        var cueData = cues [cueTime];

        console.log(cueTime, cueData);

        ooplayer.pause();
        ooplayer.setPlayheadTime(cueTime);

        $('#full_description').val( cueData.description_long );

        return false;
     });

     $('.cue-collection').on('click', 'a.secondary-content', function (evt) {
        evt.preventDefault();
        var cueTime = $(evt.target).data('time');
        deleteCue (cueTime);
        return false;
     });

     $('button[name="save"]').on('click', function(evt){
        if( cues.length ){

            var data = {
               provider: provider,
               embed:embed_code,
               cues: cues
            };

           $.post( 'save_cues',data, function(r){
              Materialize.toast('Cues Saved', 3000);
           }, 'json').error(function(){
              Materialize.toast('Error saving cues', 3000);
           });

         } else {
           Materialize.toast('Insert at least one cue', 3000);
        }

        return false;
     });

     $('#cue-editor').on('submit', function(evt) {
        evt.preventDefault();

        var cueData = {};
        var formValuesArray = $(this).serializeArray();
        var ignoredFields = ['MAX_FILE_SIZE'];

        for (var formInputKey in formValuesArray) {
           var fieldName = formValuesArray[formInputKey].name;
           if ($.inArray(fieldName, ignoredFields) === -1) {
            cueData[fieldName] = formValuesArray[formInputKey].value;
           }
        }

        var cueTime = cueData.cue_time.split(':');
        cueTime = cueTime[0]*60 + cueTime[1]*1;

        if ( typeof cues [ cueTime ] != 'undefined') {
           cues.length --;
        }

        cues [ cueTime ] = cueData;

        var cueFormat = cueTypes[ cueData.type ];

        if (typeof cueFormat != 'undefined') {
           var cueInfo = cueTemplate.replace('{{cue}}', cueTime)
                                    .replace(/\{\{sectime\}\}/g, cueTime)
                                    .replace('{{color}}', cueFormat.color)
                                    .replace('{{span}}', cueFormat.image ? 's10' : 's12')
                                    .replace('{{image}}', cueFormat.image ? imageTemplate : '')
                                    .replace('{{icon}}', cueFormat.icon)
                                    .replace('{{time}}', cueData.cue_time)
                                    .replace('{{title}}', cueData.title)
                                    .replace('{{desc_short}}', cueFormat.short ? cueData.description_short : '')
                                    .replace('{{desc_long}}', cueFormat.long ? cueData.description_long  : '');
           if ( insertCue(cueTime,  cueInfo, cueFormat.image )) {

              this.reset();

              if ($('#edit-player').data('status') == STATUS_PAUSE
                           && initialStateOnFocus == STATUS_PLAY) {
                 ooplayer.play();
              }

           } else {
              Materialize.toast('There is an error', 3000);
           }
        } else {
           Materialize.toast('There is an error', 3000);
        }
     });
  }); //end of document ready
})(jQuery); //end of jQuery name space