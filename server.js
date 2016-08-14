//
// # SimpleServer
//
// A simple chat server using Socket.IO, Express, and Async.
//
var http = require('http');
var express = require('express');
var router = express();
var server = http.createServer(router);
var util = require('util');
var Caman = require('caman').Caman;
//var Canvas = require('./node_modules/caman/node_modules/canvas');
var Canvas = require('canvas');
var Image = Canvas.Image;
var qr = require('qr-image'); 
var request = require('request').defaults({ encoding: null });
var concat = require('concat-stream');
var originalImgUrl =  "https://upload.wikimedia.org/wikipedia/en/2/24/Lenna.png";
var urlparse = require('url');


server.listen( process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("service running at:", addr.address + ":" + addr.port);
});

function getImgUrl( req ){
  var urlstr = req.url.replace(/^.*http:\/\//,"http://") ;
  var url = urlparse.parse( urlstr );
  console.log("url.host: " + url.host);
  if( url.host !== "" ){
    return urlstr;
  }
  var imgurl = req.query.url || originalImgUrl ;
  console.log("imgurl: " + imgurl);
  return imgurl; 
}

/*
function isImageUrl( url ){
    request.head( url ).on('response', function(response){ 
      var contentType = response.headers['content-type'];
      var fileType = contentType.split("/")[0];
      var isImage = (fileType === "image")
    });
    
}
*/

router.get('/*', function(req, res) {
  originalImgUrl = getImgUrl( req );

  var qrStream = concat( loadAndProcessImage ); 
  qrStream.on('error', getHttpErrorHandler( res ));
  qr.image(originalImgUrl, { type: 'png' }).pipe(qrStream);

  
  function loadAndProcessImage(qrCodeBuffer ) {
    var qrcode_img = new Image();
    qrcode_img.src = qrCodeBuffer;

    request.get( originalImgUrl, function (err, response, buffer) {
      if(err) return getHttpErrorHandler(res)(err);
      Caman(buffer,function(){
        /* Apply caman filters here */
        this.render( function(){ 
          console.log("saving image to: " + __dirname );
          console.log( util.inspect(this.canvas));
  
          var canvas = this.canvas;
          var ctx = canvas.getContext('2d');

          var qrCodeSize = 70;

          console.log( "Original image size: " + canvas.width + "x" + canvas.height );
          console.log( "qrCode adjusted size: " + qrCodeSize );
          

          ctx.drawImage(qrcode_img, canvas.width - qrCodeSize, canvas.height - qrCodeSize, qrCodeSize, qrCodeSize);
          var fontSize = 10; //0.03 * canvas.height;

          ctx.font = "" + fontSize + "px Verdana";
          ctx.fillStyle = "white";
          var imgTxt = "source: " + originalImgUrl;
          ctx.fillText( imgTxt, canvas.width - ctx.measureText(imgTxt).width - qrCodeSize - 10, canvas.height - fontSize);

  
  
          this.canvas.toBuffer( function(err, data){
               if(err) return getHttpErrorHandler(res)(err, "Error converting the canvas to a binary buffer to show it on the browser.");
               res.writeHead(200, {'Content-Type': 'image/jpeg' });
               res.end(data, 'binary');
          });
          
          
        });
      });
    });
  }
});




function errorHandler( err ){
  console.log(err);
  return;
}

function getHttpErrorHandler( res ){
  var handler = function( err ){
    res.status( 503 ).send("I'm so sorry. Something went wrong on the server. Maybe if you come back later...");    
    errorHandler(err);
  };
  
  return handler;
}
