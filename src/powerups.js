//Los IDs de los powerups son: Zapato:0, Reloj:1, Antorcha:2, Escudo:3

function executePowerup(tile, x,y){
    var powerupLayer = gameplayMap.getLayer("Powerups");
    var idPowerup = tile.powerup;

    delete tile.powerup;
    tile.rect.width=0;
    tile.rect.height=0;

    switch(idPowerup){
        case '0':
            //TODO
            break;
        case '1':
            //TODO
            break;
        case '2':
            TorchController.activateTorch();
            break;
        case '3':
            //TODO
            break;
    }

    powerupLayer.setTileGID(0,x,y);
    powerupLayer.removeTileAt(cc.p(x,y));
}

var TorchController = (function(){
    //Variables de antorcha
    var duration = 4;
    var scaleFactor = 1.40;
    var transitionTime = 1.2;

    var pub = {};

    //Funcion de activacion de antorcha
    pub.activateTorch = function(){
        var fog = currentGameplayScene.fog;
        var currScaleX = fog.getScaleX();
        var currScaleY = fog.getScaleY();

        var scaleAction = cc.scaleTo(transitionTime,currScaleX*scaleFactor, currScaleY*scaleFactor);
        var scaleBackAction = cc.scaleTo(transitionTime,currScaleX, currScaleY);
        var delay = cc.delayTime(duration + transitionTime);
        var sequence = cc.sequence(new Array(scaleAction, delay, scaleBackAction));

        fog.runAction(sequence);
    }


    return pub;
})();