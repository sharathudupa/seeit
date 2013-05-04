var globalPreviewTimer = 0;
var g_mapWindows = new Object();
var g_iframeId = 1;
var g_pDelay;
var g_pColor;
var g_pWindow;
var g_pDisable;
var g_pUseIP;

// regular expressions of supported sites
var imgRE = /.*\.(jpg|bmp|gif|png)$/gi;
var imgurRE = /.*imgur\.com.*/gi;
var qkmmRE = /.*(quickmeme\.com|qkme\.me).*/gi;
var ytbRE = /.*youtube\.com.*/gi;
var ytb1RE = /.*youtu\.be.*/gi;
var rdtRE = /.*reddit\.com.*/gi;

// Helpers
var delay = (function() {
  return function(callback, time) {
    clearTimeout(globalPreviewTimer);
    globalPreviewTimer = setTimeout(callback, time);
  }
})();

function getQueryVariable(query, name) {
  name = name.replace(/[\[]/, '\\\[').replace(/[\]]/, '\\\]');
  var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
  var results = regex.exec(query);
  if(results == null)
    return '';
  else
    return decodeURIComponent(results[1].replace(/\+/g, ' '));
}

function urlTrim(url) {
  // trim trailing / character
  if (url.substr(-1) == '/') {
    return url.substr(0, url.length-1);
  }
  return url;
}

function resizeImg(scale, img_width, img_height) {
  var width = $(window).width() * scale;
  var height = $(window).height() * scale;
  var ratio = 1;
  
  // resize only for width overlaps
  if (width < img_width) {
    ratio =  width / img_width;
  } 
  if (height < img_height && ratio > height / img_height) {
    ratio = height / img_height;
  }
  
  return ratio;
}

function previewLink(ahref, posX, posY) {

  function openDialog(w, h) {
    $('#seeit_loading').hide();
      
    // add padding to width & height
    w += 22;
    h += 10;
    
    if (g_pWindow > 0) {
      $('div.ui-dialog:not(.dialog-minimized)').find('.ui-dialog-content').each(function() {
        if (g_pWindow == 1) {
          $(this).dialog('minimize');
        }
        else {
          $(this).dialog('close');
        }
      });
    }

    chrome.extension.sendRequest({type: 'seeit_visit', url: ahref[0].href},
                                  function(response) {});
    ahref.css('color', '#'+g_pColor);

    $preview
      .dialog({
        position: 'center', 
        closeOnEscape: false,
        canMinimize: true,
        canMaximize: true,
        minWidth: w,
        minHeight: h,
        title: ahref[0].innerText,
        close: function(e, ui) {
          $(this).remove();
          delete g_mapWindows[ahref[0].href];
        }
    });
  }

  // Preview functions
  function previewImg(url) {
    var width, height, ratio;
    
    if (g_pDisable == 1) {
      return;
    }

    $('#seeit_loading')
      .css('top', posY-14)
      .css('left', posX)
      .show();

    delay(function() {
      $previewImg
        .removeAttr('width')
        .removeAttr('height');
        
      $('<img/>') 
        .attr("src", url)
        .load(function() {
            width = this.width;   
            height = this.height; 
            $previewFrame.hide();
            ratio = resizeImg(.7, width, height);
            
            $previewImg
              .css('width', parseInt(width * ratio))
              .css('height', parseInt(height * ratio));          
            $previewImg
              .attr('src', url)
              .show();
            openDialog($previewImg.width(), $previewImg.height()); 
          });
    }, g_pDelay);
  }

  function previewImgur(path) {
    previewImg('http://i.imgur.com' + path + '.gif');
  }

  function previewQkmm(path) {
    previewImg('http://i.qkme.me/' + path.substring(path.lastIndexOf('/')) + '.jpg');
  }

  function previewPage(url, inText) {
    var width = parseInt($(window).width() * .6);
    var height = parseInt($(window).height() * .9);

    if (g_pDisable == 2) {
      return;
    }
    
    if (inText && g_pUseIP == 1) {
      url = 'http://instapaper.com/text?u=' + url;
    }
    
    $('#seeit_loading')
      .css('top', posY-14)
      .css('left', posX)
      .show();

    delay(function() {
      $previewImg.hide();
      $previewLoading.show();
      $previewFrame
        .attr('src', url)
        .load(function() { 
          $previewLoading.hide();
          $previewFrame.css('height', 16536);
          $preview.css('height', height);
         })
        .show();
      openDialog(width, height);
    }, g_pDelay);
  }

  function previewYoutube(video) {
    if (g_pDisable == 2) {
      return;
    }
  
    $('#seeit_loading')
      .css('top', posY-14)
      .css('left', posX)
      .show();

    delay(function() {
      $previewImg.hide();
      $previewFrame
        .attr('src', 'http://www.youtube.com/embed/' + video)
        .css('height', 315)
        .show();  
      openDialog(420, 315);
    }, g_pDelay);
  }
  
  //previewLink implementation
  var $iframeID = 'iframe' + g_iframeId++;
  var $previewFrame = $('<iframe id="' + $iframeID + '" width="100%" height=0/>');
  var $previewImg = $('<img style="display:none" />');
  var $previewLoading = $('<img />');
  var $preview = $('<div />')
                    .append($previewFrame)
                    .append($previewImg)
                    .append($previewLoading)
                    .attr('name', ahref[0].href);

  $previewLoading
    .attr('src', chrome.extension.getURL('images/spinner.gif'))
    .css({position: 'fixed', top: '50%', left: '50%', marginTop: '-24px', marginLeft: '-24px'})
    .hide();
  
  if (g_mapWindows[ahref[0].href]) {
    g_mapWindows[ahref[0].href].remove();
  }
  
  $('body').append($preview);
  g_mapWindows[ahref[0].href] = $preview;
  
  var href = urlTrim(ahref[0].href);
  var hostname = ahref[0].hostname;
  var pathname = urlTrim(ahref[0].pathname);
  
  if (href.match(imgRE)) {
    previewImg(href);
  }
  else if (hostname.match(imgurRE) && (pathname.split('/').length-1) == 1) {
    previewImgur(pathname);
  }
  else if (hostname.match(qkmmRE)) {
    previewQkmm(pathname);
  }
  else if (hostname.match(ytbRE)) {
    previewYoutube(getQueryVariable(ahref[0].search, 'v'));
  } 
  else if (hostname.match(ytb1RE)) {
    previewYoutube(pathname.substring(pathname.lastIndexOf('/')));
  }
  else if (hostname.match(rdtRE)) {
    previewPage(href, false);
  }
  else {
    previewPage(href, true);
  }
}

$(document).ready(function() {
  $(document).keyup(function(e) {
    if (e.keyCode == 27) {
      var zmax = 0;
      $('div.ui-dialog:not(.dialog-minimized)').each(function() {
        var zcur = parseInt($(this).css('z-index'));
        zmax = zcur > zmax ? zcur : zmax;
      });
      
      var topmost = $('div.ui-dialog:not(.dialog-minimized)').filter(function() {
                        return parseInt($(this).css('z-index')) == zmax;
                     });
      
      topmost.each(function() {
        var name = $(this).find('.ui-dialog-content').attr('name');
        $(this).remove();
        delete g_mapWindows[name];
      });
    }
  });
  
  $('body').append('<div id="seeit_loading" style="position:absolute;width:32px;height:11px;z-index:10000"><img id="seeit_loading_img"></img></div>');
  $('#seeit_loading_img').attr('src', chrome.extension.getURL('images/dots32.gif'));
  $('#seeit_loading').hide();

  chrome.extension.sendRequest({type: "preview_options"},
                               function(response) {
                                g_pDelay = response.preview_delay * 1000;
                                g_pColor = response.preview_color;
                                g_pWindow = response.preview_window;
                                g_pDisable = response.preview_disable;
                                g_pUseIP = response.preview_useip;
                               });
                               
  $('a.title, a.thumbnail').hover(
    function (e) {
      var ahref = $(this);
      var posX = 0;
      var posY = 0;
      if (!e) {
        var e = window.event;
      }
      if (e.pageX || e.pageY) 	{
        posX = e.pageX;
        posY = e.pageY;
      }
      else if (e.clientX || e.clientY) 	{
        posX = e.clientX + document.body.scrollLeft
               + document.documentElement.scrollLeft;
        posY = e.clientY + document.body.scrollTop
               + document.documentElement.scrollTop;
      }
      
      chrome.extension.sendRequest({type: "pause_status"}, 
                                   function(response) {
                                    var preview = g_mapWindows[ahref[0].href];
                                    if (response.seeit_is_paused) {
                                    }
                                    else if (!preview || !preview.is('.ui-dialog-content')){
                                      previewLink(ahref, posX, posY);
                                    }
                                    else if (!preview.is(':visible')) {
                                      $('#seeit_loading')
                                        .css('top', posY-14)
                                        .css('left', posX)
                                        .show();
                                      delay(function() {
                                        preview.dialog('restore');
                                        $('#seeit_loading').hide();
                                      }, g_pDelay);
                                    }
                                   });
    },
    function () {
      clearTimeout(globalPreviewTimer);
      $('#seeit_loading').hide();
    }
  );
});
 
