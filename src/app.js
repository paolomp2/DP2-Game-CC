var gameplayMap;
var currentGameplayScene;


//Objeto manejador de detecciones de intersecciones y variables asociadas
var interHandler = {

    //Función que hace un scan de [offset] tiles en adelante, buscando si se aproxima una interseccion
    detectIntersection: function(tilePosX, tilePosY, direction, tileMatrix){
        var targetPoint = [];
        var factor = 1;
        var offset = 3;
        var mapSizeX = gameplayMap.getMapSize().width;
        var mapSizeY = gameplayMap.getMapSize().height;

        //Dependiendo de la dirección del niño se scanea hacia arriba, abajo, izquierda o derecha.
        switch(direction) {
            case 0 :
                targetPoint = [tilePosX, tilePosY -offset];
                break;
            case 1 :
                targetPoint = [tilePosX, tilePosY +offset];
                break;
            case 2 :
                targetPoint = [tilePosX-offset, tilePosY];
                break;
            case 3 :
                targetPoint = [tilePosX+offset, tilePosY];
                break;
            default:
                return;
        }

        //El factor es 1 o -1. Es para saber si se sumara en el eje x/y, o se restara.
        factor = ((targetPoint[0] - tilePosX) + (targetPoint[1] - tilePosY))/offset;

        //Variable que indica si el scan se hace horizontal o vertical
        var horizontal = tilePosX == targetPoint[0] ? 0 : 1;

        //El scan propiamente implementado
        for(var i=tilePosY + factor*((horizontal+1)%2); i!=targetPoint[1] + factor; i+= factor){
            for(var j=tilePosX + factor*horizontal; j!=targetPoint[0] + factor; j+= factor){
                //Validación de los limites del mapa
                if(j<0 || j>mapSizeX-1 || i<0 || i>mapSizeY-1) continue;

                //Si se encontro una intersección aproximandose, se activa el flag choiceAvailable y sameTileDetected
                //Estas indican que el usuario puede realizar una decision y que el tile encontrado es el mismo
                if(tileMatrix[j][i] == 2 && !this.sameTileDetected && !this.choiceAvailable) {
                    this.choiceAvailable = true;
                    this.sameTileDetected = true;
                    gameplayMap.sprite.setColor(new cc.Color(255,100,100,0));
                    return;
                }

                //Si el scan se encuentra con una pared, se detiene.
                if(tileMatrix[j][i] == 1){
                    return;
                }
            }
        }

    },

    //Metodo indicando que se salio del tile de intersección, y la variable sameTileDetected se libera
    intersectionExited : function(){
        this.intersectTile = null;
        this.sameTileDetected = false;
        this.choiceExecuted = false;
        gameplayMap.sprite.setColor(new cc.Color(255,255,255,0));
    },

    //Método que ejecuta la función seleccionada por el usuario con el teclado
    executeChoice: function(){
        var keyCode = this.storedDecision;

        if(keyCode == cc.KEY.down){
            childMoveAction.keyState[1] = 1;
            childMoveAction.keyState[0]=0;
            childMoveAction.keyState[2]=0;
            childMoveAction.keyState[3]=0;
        }
        if(keyCode == cc.KEY.up){
            childMoveAction.keyState[0] = 1;
            childMoveAction.keyState[1]=0;
            childMoveAction.keyState[2]=0;
            childMoveAction.keyState[3]=0;
        }
        if(keyCode == cc.KEY.left){
            childMoveAction.keyState[2] = 1;
            childMoveAction.keyState[0]=0;
            childMoveAction.keyState[1]=0;
            childMoveAction.keyState[3]=0;
        }
        if(keyCode == cc.KEY.right){
            childMoveAction.keyState[3] = 1;
            childMoveAction.keyState[0]=0;
            childMoveAction.keyState[2]=0;
            childMoveAction.keyState[1]=0;
        }

        this.storedDecision = -1;
        this.choiceExecuted = true;
    },

    //Método que guarda la selección hecha por el usuario. Se considera que en el momento que decide ya no puede
    //cambiar su elección
    recordChoice: function(keyCode){
        this.storedDecision = keyCode;
        this.choiceAvailable = false;
    },

    excessInIntersection: function(dir, sprRect, rect){
        var dif;
        switch(dir){
            case 0:{
                dif =   sprRect.y + sprRect.height - rect.y;
                break;
            }
            case 1:{
                dif =  rect.y + rect.height - sprRect.y;
                break;
            }
            case 2:{
                dif = rect.x + rect.width - sprRect.x;
                break;
            }
            case 3:{
                dif =  sprRect.x + sprRect.width - rect.x;
                break;
            }
        }
        return dif
    },

    choiceAvailable : false,
    choiceExecuted : false,
    storedDecision: -1,
    intersectTile: null,
    sameTileDetected : false,
    collisionDelay : 0
};

//Módulo de movimiento del niño
var childMoveAction = (function(){
    var tileWidth = 0;
    var speed = 2.5;
    var dummyBool = false;
    var collisionDelay = 0;
    var gameStarted = false;
    var haveShield = false;
    var mainLayer = {};
    var pub = {};
    var xNew;
    var yNew;
    pub.childPosX = 0;
    pub.childPosY = 0;


    pub.keyState = new Array(1,0,0,0);

    pub.setMainLayer = function(layer) {
        mainLayer = layer;
    };

    pub.getSpeedSprite = function(){
        return speed;
    }

    pub.updateSpeed = function(spd){
        speed = spd;
    }

    pub.updateShield = function(val){
        haveShield = val;
    }


    //monstY += speed; ESTO SE DEBE SACAR Y PONER EN OTRO MODULO
    //if(monstY >= size.height){
    //    monstY = 0;
    //}

    pub.setTileWidth = function(val){
        tileWidth = val;
    }

    //Método para detener el movimiento del niño
    var stopMovement= function(){
        pub.keyState[0]=0;
        pub.keyState[1]=0;
        pub.keyState[2]=0;
        pub.keyState[3]=0;
    }

    //Método que halla la nueva posición del niño y la devuelve en un array con la posición x, y.
    var updatePosition = function(){
        var x = pub.childPosX;
        var y = pub.childPosY;

        y += speed*pub.keyState[0];
        y -= speed*pub.keyState[1];
        x -= speed*pub.keyState[2];
        x += speed*pub.keyState[3];

        return new Array(x,y);
    }

    //Consigue la dirección actual en la que se mueve el niño
    var getCurrentDirection = function(){
        var direction = -1;
        for(var i=0; i<4 ; i++){
            if(pub.keyState[i]==1) {
                direction = i;
                break;
            }
        }
        return direction;
    }

    //Consigue el movimiento del niño pero en un vector x y.
    var getMovementVector = function(){
        var dir = getCurrentDirection();
        switch(dir) {
            case 0:
                return new Array(0,speed);
            case 1:
                return new Array(0,-speed);
            case 2:
                return new Array(-speed,0);
            case 3:
                return new Array(speed,0);
        }
    }

    //Verifica que el choque con un tile se realiza de forma perfecta: entre los extremos de los 2 rectangulos
    //que se estan chocando debe haber un espacio de 1 pixel.
    var isTrueCollision = function(sprRect, rect){
        var vector = getMovementVector();
        var dir = getCurrentDirection();
        //El sprRect es un rect con la posición futura del sprite. A este se le resta el vector de dirección para
        //conseguir el rectangulo actual.
        var newSprRect = cc.rect(sprRect);
        newSprRect.x = newSprRect.x - vector[0];
        newSprRect.y = newSprRect.y - vector[1];

        //Dependiendo de la dirección, se evalua que solo halla una diferencia de 1 pixel entre los extremos en contacto
        switch(dir){
            case 0:{
                var dif = rect.y - newSprRect.y - newSprRect.height;
                if(dif>1){
                    pub.childPosY += dif-1;
                    mainLayer.sprite.setPositionY(pub.childPosY);
                    return false;
                }
                break;
            }
            case 1:{
                var dif = newSprRect.y - rect.y - rect.height;
                if(dif>1){
                    pub.childPosY -= dif-1;
                    mainLayer.sprite.setPositionY(pub.childPosY);
                    return false;
                }
                break;
            }
            case 2:{
                var dif = newSprRect.x - rect.x - rect.width;
                if(dif>1){
                    pub.childPosX -= dif-1;
                    mainLayer.sprite.setPositionX(pub.childPosX);
                    return false;
                }
                break;
            }
            case 3:{
                var dif = rect.x - newSprRect.x - newSprRect.width;
                if(dif>1){
                    pub.childPosX += dif-1;
                    mainLayer.sprite.setPositionX(pub.childPosX);
                    return false;
                }
                break;
            }
        }
        return true;
    }

    var interCollision = function(direction, sprRect, tile){
        //Si es el primer contacto con el tile de intersección, se registra el mismo y se inicializa
        //el delay para ejecutar la decisión del usuario
        if(interHandler.intersectTile==null){
            interHandler.intersectTile = tile;
            collisionDelay = tileWidth-1;
            collisionDelay -= interHandler.excessInIntersection(direction, sprRect, tile.rect);
            interHandler.choiceAvailable=false;
            mainLayer.sprite.setColor(new cc.Color(255,255,255,0));

            //Si ya está dentro del tile, se disminuye el valor el contador collisionDelay
        }else{
            if(interHandler.choiceExecuted) return 1;

            //Si se acabo el delay se ejecuta la acción y se cambia de direccion
            if(collisionDelay==0){
                interHandler.executeChoice();
                var array = updatePosition();
                xNew = array[0];
                yNew = array[1];
            }
            //Si el delay es negativo, se debe retroceder la cantidad excedida en la direccion contraria
            else if(collisionDelay - speed<0){
                var excess = speed - collisionDelay;
                collisionDelay = 0;
                switch(direction){
                    case 0:
                        yNew -= excess;
                        break;
                    case 1:
                        yNew += excess;
                        break;
                    case 2:
                        xNew += excess;
                        break;
                    case 3:
                        xNew -=excess;
                        break;
                }
            }
            else{
                //Delay para activar la decision tomada por el jugador
                collisionDelay =collisionDelay - speed ;
            }
        }
        return 0;
    }

    //Metodo principal de movimiento
    pub.update = function(){
        if(!gameStarted){
            if(zoomGame.autoZoomIn()) return;
            else{
                gameStarted = true;
                ChildSM.startRunning();
                currentGameplayScene.startMaze();
            }
        }

        if(ChildSM.isStopped()) return;

        var sprite = mainLayer.sprite;
        var monstruo = mainLayer.monster;
        pub.childPosX = sprite.getPositionX();
        pub.childPosY = sprite.getPositionY();

        var monstX = monstruo.getPositionX();
        var monstY = monstruo.getPositionY();
        var lastMov = -1;

        //Se halla la nueva posición del niño
        var array =updatePosition();
        xNew = array[0];
        yNew = array[1];

        var spriteWidth = sprite.width;
        var rect1 = cc.rect(xNew-spriteWidth/2,yNew - spriteWidth/2,spriteWidth,spriteWidth);

        var posX = mainLayer.getMatrixPosX(pub.childPosX, tileWidth);
        var posY = mainLayer.getMatrixPosY(pub.childPosY, tileWidth);

        //Condicion de victoria
        if(posX == mainLayer.finishPoint[0] && posY == mainLayer.finishPoint[1]){
            alert("YOU WIN!");
            close();
        }

        var direction = getCurrentDirection();

        //Se ejecuta el método de scan de intersecciones.
        interHandler.detectIntersection(posX,posY,direction, mainLayer.tileMatrix);

        //Si la elección ya se ejecuto, se debe esperar a salir completamente del tile de interseccion
        if(interHandler.choiceExecuted==true){
            var collBox = cc.rect(pub.childPosX-sprite.width/2,pub.childPosY - sprite.height/2,30,30);
            if(!cc.rectIntersectsRect(collBox,interHandler.intersectTile.rect)){
                interHandler.intersectionExited();
            }
        }

        //Verificacion de colisión
        for(var i=1; i < mainLayer.obstacles.length ; i++ ){
            var tile = mainLayer.obstacles[i];
            var rectM = cc.rect(monstX - monstruo.width/2, monstY - monstruo.height/2,550,550);

            if(cc.rectIntersectsRect(rect1,tile.rect)){
                //Si choca contra un powerup
                if('powerup' in tile){
                    executePowerup(tile);
                    break;
                }

                //Si choca contra una trampa
                if('trap' in tile){
                    executeTrap(tile);
                    break
                }

                //Si choca contra un collectable
                if('collectable' in tile){
                    pickCollectable(tile);
                    break
                }

                //Si choca con una interseccion
                if(tile.typeTerr == 2){
                    var result = interCollision(direction, rect1, tile);
                    if(result==0)break;
                    else continue;
                }

                if(!isTrueCollision(rect1, tile.rect)) return;

                //Frenar
                stopMovement();

                //Hallar direccion inversa antes del choque
                var lastMovInv=-1;
                switch(direction) {
                    case 0 :
                        lastMovInv = 1;
                        break;
                    case 1 :
                        lastMovInv = 0;
                        break;
                    case 2 :
                        lastMovInv = 3;
                        break;
                    case 3 :
                        lastMovInv = 2;
                        break;
                }

                var movements = new Array(0,0,0,0);

                //Evalua posibles movimientos en caso de choque con pared
                if(posX<mainLayer.getMapSize().width-1 && mainLayer.tileMatrix[posX+1][posY]!=1) movements[3]=1; //derecha
                if(posX>0 && mainLayer.tileMatrix[posX-1][posY]!=1) movements[2]=1; //izquierda
                if(posY>0 && mainLayer.tileMatrix[posX][posY-1]!=1) movements[0]=1; //arriba
                if(posY<mainLayer.getMapSize().height-1 && mainLayer.tileMatrix[posX][posY+1]!=1) movements[1]=1; //abajo

                var possibleMovements = [];

                for(var i=0;i<4;i++) {
                    if (movements[i] == 1 && i!=lastMovInv) {
                        possibleMovements.push(i);
                    }
                }

                if(possibleMovements.length==0)
                    possibleMovements.push(lastMovInv);

                var random = Math.random();
                var realRandom = parseInt(random*possibleMovements.length);

                pub.keyState[possibleMovements[realRandom]]= 1;
                lastMov = possibleMovements[realRandom];
                return;
            }

            if(cc.rectIntersectsRect(rectM,rect1)){
                alert("You Lose");
                return;
            }
        }
        monstY+=clockController.getSpeed();
        mainLayer.sprite.setPosition(xNew,yNew);
        monstruo.setPosition(monstX,monstY);
    }

    return pub;

})();


var GameplayMap = cc.TMXTiledMap.extend({
    sprite:null,
    monster:null,
    finishPoint: null,
    tileMatrix:null,
    collectables: null,
    willPoints:0,
    intersections: [],

    ctor:function (levelName) {
        this._super();
        this.initWithTMXFile("res/" + levelName);

        var mapHeight = this.getMapSize().height;
        var mapWidth = this.getMapSize().width;
        var tileWidth= this.getTileSize().height;
        childMoveAction.setTileWidth(tileWidth);
        var size = cc.winSize;

        this.obstacles = [];
        this.collectables=new Array(0,0,0,0,0);
        this.willPoints = 2;
        this.initTileMatrix();
        this.initObstacles();

        this.sprite= new cc.Sprite("res/Bola1.png");
        this.sprite.setVisible(false);
        this.monster = new cc.Sprite("res/monster.jpg");
        this.monster.setPosition(size.width/2,-300);

        ChildSM.setChild(this.sprite);

        this.getMatrixPosX = function(pixelX, tileWidth){
            var modX = pixelX % tileWidth;
            if (modX == 0)
                return parseInt(pixelX / tileWidth) - 1;
            else
                return parseInt(pixelX / tileWidth);
        }

        this.getMatrixPosY = function(pixelY, tileWidth){
            var modY = pixelY % tileWidth;
            if(pixelY!=0) {
                if (modY == 0)
                    return this.getMapSize().height -1 -parseInt(pixelY / tileWidth) - 1;
                else
                    return this.getMapSize().height -1 -parseInt(pixelY / tileWidth);
            }
        }

        this.initStartnFinish();

        //Se crea el listener para el teclado, se podria usar tambien un CASE en vez de IFs
        cc.eventManager.addListener({
            event: cc.EventListener.KEYBOARD,
            onKeyPressed:  function(keyCode, event){
                if(!interHandler.choiceAvailable) return;
                interHandler.recordChoice(keyCode);
            },

            onKeyReleased: function(keyCode, event){

                if(BoardController.isActivated() && keyCode>=65 && keyCode<=90){
                    var letter = String.fromCharCode(keyCode);
                    BoardController.keyboardInput(letter);
                }

                if(MeshController.isActivated())
                    MeshController.keyboardInput(keyCode);                
            }

        }, this);

        //Eventos Touch

        cc.eventManager.addListener({
            event: cc.EventListener.TOUCH_ONE_BY_ONE,
            // When "swallow touches" is true, then returning 'true' from the onTouchBegan method will "swallow" the touch event, preventing other listeners from using it.
            swallowTouches: true,
            //onTouchBegan event callback function
            onTouchBegan: function (touch, event) {

                if(lunchBoxController.isActivated())
                {
                    //Obtengo la posición X e Y respecto del mapa
                    // event.getCurrentTarget() returns the *listener's* sceneGraphPriority node.
                    var target = event.getCurrentTarget();

                    //Get the position of the current point relative to the button
                    var locationInNode = target.convertToNodeSpace(touch.getLocation());
                    var s = target.getContentSize();
                    var rect = cc.rect(0, 0, s.width, s.height);
                    //Check the click area
                    if (cc.rectContainsPoint(rect, locationInNode)) {
                        lunchBoxController.onClickMouse(locationInNode.x,locationInNode.y);
                    }
                }
            },

        },this);


        var animFrames = [];
        //Se crean los frames de la animaci�n
        for(var i=1;i<5;i++){
            var str = "res/Bola"+i+".png";
            var animFrame = new cc.AnimationFrame(new cc.SpriteFrame(str,cc.rect(0,0,30,30)), 1,null);
            animFrames.push(animFrame);
        }
        //Se crea la animaci�n que reproduce en secuencia los frames agregados al array animFrames.
        var animation = new cc.Animation(animFrames, 0.08, 100);
        var animate   = cc.animate(animation);

        //En este caso, se crea una acci�n infinita para que la animacion se reproduzca siempre
        var infiniteAction = new cc.RepeatForever(animate);

        this.addChild(this.monster,10);

        //Ejecutar acciones de animacion
        this.sprite.runAction(infiniteAction);
        return true;
    },

    initObstacles : function() {
        var mapWidth = this.getMapSize().width;
        var mapHeight = this.getMapSize().height;
        var tileWidth = this.getTileSize().width;
        var tileHeight = this.getTileSize().height;
        var tileProps = this._tileProperties;

        var collidableLayer = this.getLayer("Collision");
        var intersectionLayer = this.getLayer("Intersection");
        var collectableLayer = this.getLayer("Collectables");
        var powerupLayer = this.getLayer("Powerups");
        var trapLayer = this.getLayer("Traps");

        var i, j;

        for (i = 0; i < mapWidth; i++) {
            for (j = 0; j < mapHeight; j++) {
                var tileCoord = new cc.Point(i, j);
                var tileXPosition = i * tileWidth;
                var tileYPosition = (mapHeight * tileHeight)
                    - ((j + 1) * tileHeight);

                //Paredes
                var gid = collidableLayer.getTileGIDAt(tileCoord);
                if (gid) {
                    var cTile = {};
                    cTile.typeTerr = 1;
                    cTile.rect = cc.rect(tileXPosition, tileYPosition,
                        tileWidth, tileHeight);

                    this.obstacles.push(cTile);
                    this.tileMatrix[i][j]=1;
                }

                //Intersecciones
                gid = intersectionLayer.getTileGIDAt(tileCoord);
                if (gid) {
                    cTile = {};
                    cTile.typeTerr = 2;
                    cTile.rect = cc.rect(tileXPosition, tileYPosition,
                        tileWidth, tileHeight);

                    this.obstacles.push(cTile);
                    this.intersections.push(cTile);
                    this.tileMatrix[i][j]=2;
                }

                //Powerups
                gid = powerupLayer.getTileGIDAt(tileCoord);
                if (gid) {
                    if(!(gid in tileProps)) continue;
                    var tilePropEntry = tileProps[""+gid];
                    if(!('powerupId' in tilePropEntry)) continue;

                    var idPowerup = tilePropEntry['powerupId'];

                    cTile = {};
                    cTile.powerup = idPowerup;
                    cTile.x = i;
                    cTile.y = j;
                    cTile.rect = cc.rect(tileXPosition, tileYPosition,
                        tileWidth, tileHeight);

                    this.obstacles.push(cTile);
                }

                //Traps
                gid = trapLayer.getTileGIDAt(tileCoord);
                if (gid) {
                    if(!(gid in tileProps)) continue;
                    var tilePropEntry = tileProps[""+gid];
                    if(!('trapId' in tilePropEntry)) continue;

                    var idTrap = tilePropEntry['trapId'];

                    cTile = {};
                    cTile.trap = idTrap;
                    cTile.x = i;
                    cTile.y = j;
                    cTile.rect = cc.rect(tileXPosition, tileYPosition,
                        tileWidth, tileHeight);

                    this.obstacles.push(cTile);
                }

                //Collectables
                gid = collectableLayer.getTileGIDAt(tileCoord);
                if (gid) {
                    if(!(gid in tileProps)) continue;
                    var tilePropEntry = tileProps[""+gid];
                    if(!('collectableId' in tilePropEntry)) continue;

                    var idCollectable = tilePropEntry['collectableId'];

                    cTile = {};
                    cTile.collectable = idCollectable;
                    cTile.x = i;
                    cTile.y = j;
                    cTile.rect = cc.rect(tileXPosition, tileYPosition,
                        tileWidth, tileHeight);

                    this.obstacles.push(cTile);
                }

            }
        }

    },

    //Método de inicialización de los puntos de inicio y fin
    initStartnFinish : function (){
        var startFinishLayer = this.getLayer("StartFinish");
        var tileWidth = this.getTileSize().width;
        var start = startFinishLayer.properties.start.split(",");
        this.sprite.setPosition(start[0]*tileWidth + tileWidth/2 , (this.getMapSize().height - start[1] -1)*tileWidth + tileWidth/2 );
        this.finishPoint = startFinishLayer.properties.finish.split(",");
    },

    //Inicialización de la matriz de tiles
    initTileMatrix : function(){
        var mapWidth = this.getMapSize().width;
        var mapHeight = this.getMapSize().height;
        var tileWidth = this.getTileSize().width;
        this.tileMatrix = new Array(mapWidth);

        for (var i=0;i<mapWidth;i++){
            this.tileMatrix[i] = new Array(mapHeight);
        }

        for(var i=0;i<mapWidth;i++){
            for(var j=0;j<mapHeight;j++){
                this.tileMatrix[i][j]=0;
            }
        }
    }

});

//Funcion para inicializar la osucridad que rodea al niño
function initFog(map){

    //Se carga el sprite que representa la oscuridad
    var fog = new cc.Sprite("res/GameFog.png");
    fog.setScale(1.25, 1.25);

    //El sprite que representa la oscuridad siempre esta encima del niño
    fog.setPosition(map.sprite.getPositionX(), map.sprite.getPositionY());
    fog.schedule(function (){
        this.setPositionX(gameplayMap.sprite.getPositionX());
        this.setPositionY(gameplayMap.sprite.getPositionY());
    });

    return fog;
};

var zoomGame = {

    //Funcion para generar el efecto de zoom sobre el mapa
    //typeZoom:     0 = in, 1 = out
    //zoom_Range:   indica el incremento del zoom
    //initZoom:     indica el zoom inicial del mapa
    //time_Zoom:    indica el tiempo de zoom
    ctor: function(type_Zoom, zoom_Range, time_Zoom, init_Zoom)
    {
        gameplayMap.setScale(init_Zoom);
        this.typeZoom = type_Zoom;
        this.zoomRange= zoom_Range;
        this.timeZoom = time_Zoom;
        this.scaleInit = init_Zoom;
        this.timeLeft = this.timeZoom;
        this.currentScale = init_Zoom;
        if(time_Zoom==0)
            this.zoomActivate = false;
    },

    autoZoomIn:function()
    {
        if(this.zoomActivate)
        {
            var date = new Date();
            var curDate = null;

            do { curDate = new Date(); }
            while(curDate-date < this.timeZoom);
            this.zoomActivate=false;
        }

        if(this.currentScale<1)
        {
            this.currentScale+=this.zoomRange;
            gameplayMap.setScale(this.currentScale);
            return true;
        }else
            return false;

    },

    zoomRange:0.01,
    typeZoom:1,
    scaleInit:1,
    currentScale:0.1,
    timeZoom:38000,
    timeLeft:38000,
    zoomActivate:true,
}

var HelloWorldScene = cc.Scene.extend({
    gameplayLayer : null,
    hudLayer: null,
    fog : null,

    ctor: function(){
        this._super();
        this.gameplayLayer = new cc.Layer();
        var root = ccs.load(res.gameHUD_json);
        this.hudLayer = root.node;

        var map = new GameplayMap("levels/map2.tmx");
        this.fog = initFog(map);
        this.fog.setVisible(false);

        gameplayMap = map;
        this.gameplayLayer.addChild(map,0);
        this.gameplayLayer.addChild(map.sprite, 5);
        this.gameplayLayer.addChild(this.fog, 20);

        //inicializo el zoom
        zoomGame.ctor(0,0.01,1600,0.280);

        //Se inicializa el modulo de movimiento del niño
        childMoveAction.setMainLayer(map);

        //Por ultimo, se añade el layer de gameplay a la scene, en el orden Z mas bajo.
        this.addChild(this.gameplayLayer, 0);
        this.addChild(this.hudLayer, 1);
    },

    onEnter:function () {
        this._super();
        currentGameplayScene = this;
        gameplayMap.schedule(childMoveAction.update);
    },

    startMaze: function(){
        gameplayMap.sprite.setVisible(true);
        this.fog.setOpacity(0);
        this.fog.setVisible(true);
        this.fog.runAction(cc.fadeIn(1.5));
        this.gameplayLayer.runAction(cc.follow(gameplayMap.sprite));
    }
});

