utils = (function(){

	return {
		collided: function(){
			var looksLikeABox = arguments[0].width && arguments[0].height;
			if(looksLikeABox){
				return this.boxCollided.apply(this,arguments);
			}
		},

		getBounds: function(box){
			return {
				top: box.y - box.height/2,
				left: box.x - box.width/2,
				right: box.x + box.width/2,
				bottom: box.y + box.height/2			
			}
		},

		boxCollided: function(box1,box2){	
			var A = this.getBounds(box1);
			var B = this.getBounds(box2);

			return ! (
				(A.bottom < B.top) ||
				(A.top > B.bottom) ||
				(A.left > B.right) ||
				(A.right < B.left)
			)
		},

		unitVector: function(v){
			var len_v = Math.sqrt(v.x*v.x + v.y*v.y);
			return {
				x: v.x /len_v,
				y: v.y / len_v
			}
		},

		dotProduct: function(a,b){
			return a.x*b.x + a.y*b.y;
		},

		projection: function(a,b){
			var dp = this.dotProduct(a,b);
			return {
				x: ( dp / (b.x*b.x + b.y*b.y) ) * b.x,
				y: ( dp / (b.x*b.x + b.y*b.y) ) * b.y
			}
		}
	}
	
})();

_.mixin({
	/*
	Just like extend, but does not modify.
	Useful for merging components for API calls, without modifying the originals
	*/
	create: function() {
		var args = Array.prototype.slice.call(arguments);
		args.unshift({});
		return this.extend.apply(this,args);
	},

	/*
	Returns the 1 or -1 depending on the polarity of input.
	*/
	polarity: function(num){
		if(this.isNumber(num)){
			return num > 0 && 1 || -1;
		}
	},

});

Keys = new (function(){

	this.DOWN = {};
	that = this;

	window.onkeydown = function(e){
		that.DOWN[e.keyCode] = that.DOWN[e.keyCode] || 0;
	}

	window.onkeyup = function(e){
		delete that.DOWN[e.keyCode];
	}

})();

/*
	Entity Manager
*/

E = (function(){
	return {

		components: {},
		
		create: function(components){
			var uid = _.uniqueId();
			this[uid] = uid;
	
			_(components).each(function(component,componentName){
				this.add(uid,componentName,component);
			},this)

			return uid;
		},

		add: function(uid, componentName, component){
			this.components[componentName] = this.components[componentName] || {};

			this[componentName] = function(entity){
				if(entity){
					return this.components[componentName] && this.components[componentName][entity];
				} else {
					return this.components[componentName];
				}
			}

			if(!this.components[componentName][uid]){
				
				if(uid in this){
					this.components[componentName][uid] = component
				}
			}
		},

		remove: function(uid){
			_(this.components).each(function(componentHash,componentName){
				delete componentHash[uid];
			});
		}
	}
})();


Systems = {

	BoundsRendering: function(){
		E.Bounds && E.BoundsRenderable && _(E.BoundsRenderable()).each(function(component,entity){
			var position = E.Position(entity);
			var bounds = E.Bounds(entity);
			if(position && bounds){
				con.save();
					con.translate(position.x-bounds.width/2,position.y-bounds.height/2);
					con.rect(0,0,bounds.width,bounds.height);
					con.stroke();
				con.restore();
			}
		});
	},

	WorldBoundsRendering: function(){
		E.WorldBounds && E.BoundsRenderable && _(E.BoundsRenderable()).each(function(component,entity){
			var position = E.Position(entity);
			var bounds = E.WorldBounds(entity);

			if(position && bounds){
				con.rect(bounds.left,bounds.top,bounds.right-bounds.left,bounds.bottom-bounds.top);
				con.stroke();
			}
		});
	},

	CanvasSetup: function () {
		window.con = window.con || can.getContext('2d');
		can.width = can.width;
		con.translate(can.width/2,can.height/2);
		window.scale = window.scale || 1;
		con.scale(scale,scale);
	},

	Movement: function(){
		E.Movement && _(E.Movement()).each(function(movement,entity){
			var position = E.Position(entity);
			if(position){
				position.x += movement.vx;
				position.y += movement.vy;
			}
		});
	},

	Gravity: function(){
		var GRAVITY_PER_TICK = 0.1;
		var MAX_GRAVITY = 9.8;
		E.GravitySensitive && _(E.GravitySensitive()).each(function(gravitySensitive,entity){
			var movement = E.Movement(entity);
			var collided = E.Collided && E.Collided(entity);
			if(!collided && movement && movement.vy < MAX_GRAVITY){
				movement.vy += GRAVITY_PER_TICK;
			}
		});
	},

	Collision: function(){
		E.CollisionSensitive && _(E.CollisionSensitive()).each(function(collisionSensitive,e1){

			_(E.CollisionSensitive()).each(function(collisionSensitive2,e2){

				if(e1 != e2){
				
					var box = [
						_.create(E.Position(e1),E.Bounds(e1)),
						_.create(E.Position(e2),E.Bounds(e2))
					];
					
					var collided = utils.collided(box[0],box[1]);
				
					if(collided){
						E.add(e1, 'Collided', { against:e2 } );
						E.add(e2, 'Collided', { against:e1 } );
					}
				}
			});
		});
	},

	Stop: function(){
		E.Solid && E.Collided && _(E.Collided()).each(function(collided,entity){

			var movement = E.Movement(entity);
			var position = E.Position(entity);
			
			var bothSolid = E.Solid(entity) && E.Solid(collided.against);

			if(movement && position && bothSolid){
				
				var box = [
					_.create(E.Position(entity),E.Bounds(entity),E.Movement(entity)),
					_.create(E.Position(collided.against),E.Bounds(collided.against),E.Movement(collided.against))
				];
				
				
				position.x -= movement.vx || 0;
				position.y -= movement.vy || 0;

				box[0].x -= box[0].vx || 0;
				if(!utils.collided(box[0],box[1])){
					movement.vx = 0;
				} else {
					box[0].x += box[0].vx || 0;
					box[0].y -= box[0].vy || 0;
					if( !utils.collided(box[0],box[1])){
						movement.vy = 0;
					} else {
						movement.vx = 0;
					}	
				}
			}
		});
	},

	Launch: function(entity,options){
		var movement = E.Movement(entity);

		if(movement){
			(options.vx) && (movement.vx += options.vx);
			(options.vy) && (movement.vy += options.vy);
		}
	},

	KeyboardActivation: function(){
		E.KeyboardActivated && _(E.KeyboardActivated()).each(function(kbActivated,entity){
			_(Keys.DOWN).each(function(count,keyCode){
				var info = kbActivated[keyCode];
				var okay = true;
				if(info){
					if(info.before && !info.before(entity,info.options)){
						return;
					}
					if(info.delay && count%info.delay != 0){
						okay = false;
					}
					if(info.once && count != 1){
						okay = false;
					}
					if(okay){
						Systems[info.system].call(null,entity,info.options);
						if(info.after){
							info.after(entity,info.options);
						}
					}
				}
			});
		});
	},

	KeyboardTicker: function(){
		_(Keys.DOWN).each(function(count,keyCode,list){
			list[keyCode]+=1
		})
	},

	Friction: function(){
		var ignore = [];
		if(E.FrictionSensitive && E.Friction && E.Collided){
			_(E.Collided()).each(function(collided,entity){
				var against = collided.against;
				var sensitive = E.FrictionSensitive(entity) || E.FrictionSensitive(against);
				var fricter = E.Friction(entity) || E.Friction(against);

				if(fricter && sensitive && !_(ignore).contains(sensitive)){
					var movement = E.Movement(entity) || E.Movement(against);
					fricter.x && (movement.vx *= fricter.x * sensitive.sensitivity);
					fricter.y && (movement.vy *= fricter.y * sensitive.sensitivity);
				}
				ignore.push(sensitive)
			});		
		}
	},

	MaxSpeed: function(){
		E.MaxSpeed && _(E.MaxSpeed()).each(function(maxSpeed,entity){
			var movement = E.Movement(entity);
			if(movement){
				if(Math.abs(movement.vx) > (maxSpeed.vx)){
					movement.vx = maxSpeed.vx * _(movement.vx).polarity();
				}
				if(Math.abs(movement.vy) > (maxSpeed.vy)){
					movement.vy = maxSpeed.vy * _(movement.vy).polarity();
				}
			}
		});
	},

	Camera: function(){
		E.CameraFocused && _(E.CameraFocused()).each(function(focused,entity){
			var pos = E.Position(entity);
			con.translate(-pos.x,-pos.y);
		})
	},

	RemoveAirborne: function(){
		E.Collided && E.Airborne && _(E.Collided()).each(function(components,entity){
			delete E.components.Airborne[entity];
		});
	},

	DrawFrames: function(){
		E.Frame && _(E.Frame()).each(function(component,entity){
			var position = E.Position(entity);
			if(position){
				con.save();
					con.translate(position.x,position.y);
					component.frame.playspeed(component.playspeed);
					component.frame.scale(component.scale);
					component.frame.next();
				con.restore();
			}
		});
	},

	AirResistance: function(){
		E.AirResistance && _(E.AirResistance()).each(function(component,entity){
			var movement = E.Movement(entity);
			movement.vx *= component.strength || 0.99;
			movement.vy *= component.strength || 0.99;
		});
	},

	WorldBounds: function(){
		E.WorldBounds && _(E.WorldBounds()).each(function(world,entity){
			var position = E.Position(entity);
			var movement = E.Movement(entity);
			var maxSpeed = E.MaxSpeed(entity);
			
			var future = {
				x: position.x + movement.vx *2,
				y: position.y + movement.vy *2,
			}

			var outside = (future.y < world.top || future.y > world.bottom) ||
			(future.x < world.left || future.x > world.right);

			if(outside){
				position.x -= movement.vx;
				position.y -= movement.vy;
				movement.vy *=  -1;
				movement.vx *=  -1;
			}
		});
	},

	ToggleSystems: function(entity,options){
		var systems = options.systems;
		var fn = _(use).intersection(systems).length > 0 && _.difference || _.union;
		use = fn(use,systems);
	},

	Collectable: function(){
		var collected = [];
		E.Collided && _(E.Collectable()).each(function(collectable, entity){
			
			var collided = E.Collided(entity);
			if(collided){
				E.add(entity,'Collected',{by: collided.against})
				collected.push(entity)
			}
		});
		E.components.Collectable = _(E.Collectable()).omit(collected);

	},

	Collected: function(){
		E.Collected && _(E.Collected()).each(function(collected,entity){
			E.add(entity,'Remove',{});
		});
	},

	Remove: function(){
		E.Remove && _(E.Remove()).each(function(remove,entity){
			E.remove(entity);
		});
	},

	CleanUp: function(){
		delete E.components.Collided;
		delete E.components.Launched;
	}
}


var player = E.create({
	Frame: {scale: 2, playspeed: 1/10, frame: new Frame().reset(resource_hook) },
	Bounds: { width:20, height:30 },
	Position: { x:0 , y:0 },
	Movement: { vx: 0, vy: 0},
	MaxSpeed: { vx: 2, vy: 2},
	AirResistance: {},
	WorldBounds: {top: -150, left: -150, right: 150, bottom: 150},
	FrictionSensitive: { sensitivity: 1 },
	CollisionSensitive: {},
	KeyboardActivated: {
		38: {system: 'Launch', options: {vy: -0.4}, delay: 1},
		37: {system: 'Launch', options: {vx: -0.4}, delay: 1},
		39: {system: 'Launch', options: {vx: 0.4}, delay: 1},
		40: {system: 'Launch', options: {vy: 0.4}, delay: 1},	
	},
	CameraFocused: {},
	BoundsRenderable: {},
	Solid: {}

});

var fish = E.create({
	Frame: {scale: 2, playspeed: 1/20, frame: new Frame().reset(resource_jelly) },
	Position: { x:0, y: 100-40 },
	CollisionSensitive: {},
	Bounds: { width: 20, height: 20 },
	Friction: { x: 0.1 },
	BoundsRenderable: {},
	Collectable: {},
});

var debug = E.create({
	KeyboardActivated: {
		192: {system: 'ToggleSystems', options: {systems: ['BoundsRendering','WorldBoundsRendering']}, once: true},
	},
})

var use = [
	'CanvasSetup', 
	'CleanUp',
	'KeyboardTicker', 
	'KeyboardActivation',
	'Movement',  
	'AirResistance',
	'Collision',
	'Collectable',
	'Collected',
	'Gravity', 
	'Stop',
	'WorldBounds',
	'MaxSpeed',
	//'Camera',
	//'Background',
	'DrawFrames',
	'Remove',
];
function loop(){
	_(use).each(function(systemName){
		Systems[systemName]();
	});
	requestAnimationFrame(loop);
}
requestAnimationFrame(loop);