/*
  Author: James Forbes 2013
  Twitter: @james_a_forbes
  Website: www.canyonthings.com

  WARNING: This is very actively developed.  I'm changing it constantly.  So if something doesn't work.  Try reloading the script
  from the same link in about 10 mins. 2013-12-15

  //required
  Canvas element must be on the page.  This will use the first one found.

  //load your images into native image objects.
  var image = $(<img>).attr({src:'link to your spritesheet'})[0];
  
  //create your frame object
  var frame = new Frame();

  //set the frame to use your image, it will figure out how many frames are in your spritesheet automatically.
  frame.reset(image);

  //draw the next frame, when you run out of frames, draw the first one if repeat is true
  frame.next();

  //change the play speed to whatever you want
  frame._playspeed = 1/3;

  Best of luck.
  Any problems, tweet me.

*/
function Frame(){
  this.initialize =  function(){
    this.count = 0;
    this.width = 0;
    this.index = 0;
    this.image = void 0;
    this._playspeed = 1 / 4;
    this.repeat = true;
    this.con = document.getElementsByTagName('canvas')[0].getContext('2d');
    this._scale = 1;
    this.x = 0;
    this.y = 0;
    return this;
  };

  this.scale = function(scale){
    if(scale == undefined){
      return this._scale;
    } else {
      this._scale = scale;
      return this;
    }
  };

  this.playspeed = function(playspeed){
    if(playspeed == undefined){
      return this._playspeed;
    } else {
      this._playspeed = playspeed;
      return this;
    }
  };

  this.onload = function(){
    this.count = this.image.width / this.image.height;
    this.width = this.image.height;
  };


  this.multipliedCoordinates = function(coords){
    coords = _.clone(coords);
    coords.x*=this.width*this.scale();
    coords.y*=this.width*this.scale();
    return coords;
  };

  this.reset = function(image,callback){
    this.image = image;
    image.onload = _.bind(this.onload,this);
    this.count = this.image.width / this.image.height;
    this.width = this.image.height;
    this.index = 0;
    callback && callback.call(this);
    return this;
  };

  this.draw = function(){
    this.con.imageSmoothingEnabled = false;
    this.con.webkitImageSmoothingEnabled = false;
    this.con.mozImageSmoothingEnabled = false;
    this.con.drawImage(this.image, Math.floor(this.index) * this.width, 0, this.width, this.width, this.x+(-this.width*this._scale) / 2, this.y+(-this.width*this._scale) / 2, this.width*this._scale, this.width*this._scale);
    return this;
  };

  this.next = function(){
    this.draw();
    this.index += this._playspeed;
    if (Math.floor(this.index) + 1 > this.count) {
      if (this.repeat) {
        this.index = 0;
      } else {
        this.index = this.count - 1;
      }
    }
    return this;
  };
  this.initialize();
}
  