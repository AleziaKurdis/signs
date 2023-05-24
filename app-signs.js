//
//  app-signs.js
//
//  Created by Alezia Kurdis, May 11th, 2023.
//  Copyright 2023, Overte e.V.
//
//  Create signs (for signalitic or for protest) in Overte.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//
(function() {
    var jsMainFileName = "app-signs.js";
    var ROOT = Script.resolvePath('').split(jsMainFileName)[0];
    
    var APP_NAME = "SIGNS";
    var APP_URL = ROOT + "signs.html";
    var APP_ICON_INACTIVE = ROOT + "icon_inactive.png";
    var APP_ICON_ACTIVE = ROOT + "icon_active.png";
    var appStatus = false;
    var channel = "org.overte.app.ak.signs";
    var timestamp = 0;
    var INTERCALL_DELAY = 200; //0.3 sec

    var DEFAULT_DATA = {
        "url": "",
        "urlHistory": []
    };
    
    var protestSignID = Uuid.NULL;
    var mugSignID = Uuid.NULL;
    
    var tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system");

    tablet.screenChanged.connect(onScreenChanged);

    var button = tablet.addButton({
        text: APP_NAME,
        icon: APP_ICON_INACTIVE,
        activeIcon: APP_ICON_ACTIVE
    });


    function clicked(){
        if (appStatus === true) {
            tablet.webEventReceived.disconnect(onAppWebEventReceived);
            tablet.gotoHomeScreen();
            appStatus = false;
        }else{
            //Launching the Application UI.
            tablet.gotoWebScreen(APP_URL);
            tablet.webEventReceived.connect(onAppWebEventReceived);
            appStatus = true;
        }
        
        if (protestSignID === Uuid.NULL && mugSignID === Uuid.NULL) {
            button.editProperties({
                isActive: appStatus
            });
        } else {
            button.editProperties({
                isActive: true
            });
        }

    }

    button.clicked.connect(clicked);

    //This recieved the message from the UI(html) for a specific actions
    function onAppWebEventReceived(message) {
        if (typeof message === "string") {
            var d = new Date();
            var n = d.getTime();
            var instruction = JSON.parse(message);
            if (instruction.channel === channel) {
                if (instruction.action === "GENERATE_PROTEST" && (n - timestamp) > INTERCALL_DELAY) {
                    d = new Date();
                    timestamp = d.getTime();
                    generateProtestSign(instruction.url, instruction.shape);
                } else if (instruction.action === "GENERATE_MUG" && (n - timestamp) > INTERCALL_DELAY) {
                    d = new Date();
                    timestamp = d.getTime();
                    generateMug(instruction.url, instruction.shape, instruction.color);
                } else if (instruction.action === "GENERATE_SIGNAGE" && (n - timestamp) > INTERCALL_DELAY) {
                    d = new Date();
                    timestamp = d.getTime();
                    generateSignageSign(instruction.url, instruction.shape);
                } else if (instruction.action === "GENERATE_FRAMED" && (n - timestamp) > INTERCALL_DELAY) {
                    d = new Date();
                    timestamp = d.getTime();
                    generateFramedSign(instruction.url, instruction.shape, instruction.isEmissive);
                } else if (instruction.action === "CLEAR_PROTEST" && (n - timestamp) > INTERCALL_DELAY) {
                    d = new Date();
                    timestamp = d.getTime();
                    clearProtest();
                } else if (instruction.action === "CLEAR_MUG" && (n - timestamp) > INTERCALL_DELAY) {
                    d = new Date();
                    timestamp = d.getTime();
                    clearMug();
                } else if (instruction.action === "LOADED_GIVE_ME_THE_DATA") {
                    sendCurrentKnownDataToUI();
                    var state = false;
                    if (protestSignID !== Uuid.NULL) {state = true;}
                    var stateMug = false;
                    if (mugSignID !== Uuid.NULL) {stateMug = true;}
                    var message = {
                        "channel": channel,
                        "action": "AVATAR_ENTITY_STATE",
                        "state": state,
                        "stateMug": stateMug
                    };
                    tablet.emitScriptEvent(JSON.stringify(message));
                } else if (instruction.action === "UPDATE_DATA") {
                    Settings.setValue( channel + ".lastUsage", instruction.data );
                } else if (instruction.action === "SELF_UNINSTALL" && (n - timestamp) > INTERCALL_DELAY) {
                    d = new Date();
                    timestamp = d.getTime();
                    ScriptDiscoveryService.stopScript(Script.resolvePath(''), false);
                }
            }
        }
    }

    //============ Add your application functions here ==================
    
    function generateMug(url, shape, color) {
        var entityIDs = Entities.findEntitiesByName("-==%%! MUG !%%==-", MyAvatar.position, 200, false);
        entityIDs.forEach(function (currentEntityID) {
            var currentEntityOwner = Entities.getEntityProperties(currentEntityID, ['owningAvatarID']).owningAvatarID;
            if (currentEntityOwner === MyAvatar.sessionUUID && currentEntityID !== mugSignID) {
                Entities.deleteEntity(currentEntityID);
            }
        });

        var textures = {
            "base_color_texture": url
        };

        var dimensions = {"x": 0.1006, "y": 0.1190, "z": 0.1408};

        var signRotation = Quat.multiply(MyAvatar.orientation, Quat.fromVec3Degrees( { x: 0, y: 0, z: 0 } ));
        
        if (mugSignID !== Uuid.NULL) {
            Entities.deleteEntity(mugSignID);
            mugSignID = Uuid.NULL;
        }
        
        mugSignID = Entities.addEntity({
           "name": "-==%%! MUG !%%==-",
           "type": "Model",
           "position": Vec3.sum(MyAvatar.position, Vec3.multiplyQbyV(MyAvatar.orientation, { x: 0, y: 0, z: -0.6 })),
           "rotation": signRotation,
           "dimensions": dimensions,
           "modelURL": ROOT + "models/mug_" + color + "_" + shape.toLowerCase() + ".fst",
           "useOriginalPivot": true,
           "shapeType": "simple-compound",
           "grab": {
               "grabbable": true
           },
           "textures": JSON.stringify(textures),
           "lifetime": 10800
        }, "avatar");
        
        var state = false;
        if (protestSignID !== Uuid.NULL) {
            state = true;
        }         
        var message = {
            "channel": channel,
            "action": "AVATAR_ENTITY_STATE",
            "state": state,
            "stateMug": true
        };
        tablet.emitScriptEvent(JSON.stringify(message));
    }

    
    function generateProtestSign(url, shape) {
        var entityIDs = Entities.findEntitiesByName("-==%%! Protest Sign !%%==-", MyAvatar.position, 200, false);
        entityIDs.forEach(function (currentEntityID) {
            var currentEntityOwner = Entities.getEntityProperties(currentEntityID, ['owningAvatarID']).owningAvatarID;
            if (currentEntityOwner === MyAvatar.sessionUUID && currentEntityID !== protestSignID) {
                Entities.deleteEntity(currentEntityID);
            }
        });

        var textures = {
            "base_color_texture": url,
            "normalmap_texture": ROOT + "models/woodNormal256.jpg"
        };

        var dimensions = {"x": 1, "y": 1, "z": 1};
        switch(shape) {
            case "S":
                dimensions = {"x": 0.5, "y": 1.0280, "z": 0.0273};
                break;
            case "H":
                dimensions = {"x": 0.5985, "y": 0.9453, "z": 0.0273};
                break;
            case "V":
                dimensions = {"x": 0.3997, "y": 1.2364, "z": 0.0273};
                break;
        }
        var signRotation = Quat.multiply(MyAvatar.orientation, Quat.fromVec3Degrees( { x: 90, y: 180, z: 0 } ));
        
        if (protestSignID !== Uuid.NULL) {
            Entities.deleteEntity(protestSignID);
            protestSignID = Uuid.NULL;
        }
        
        protestSignID = Entities.addEntity({
           "name": "-==%%! Protest Sign !%%==-",
           "type": "Model",
           "position": Vec3.sum(MyAvatar.position, Vec3.multiplyQbyV(MyAvatar.orientation, { x: 0, y: 0, z: -1 })),
           "rotation": signRotation,
           "dimensions": dimensions,
           "modelURL": ROOT + "models/protest_sign_" + shape.toLowerCase() + ".fst",
           "useOriginalPivot": true,
           "shapeType": "simple-compound",
           "grab": {
               "grabbable": true
           },
           "textures": JSON.stringify(textures),
           "lifetime": 10800
        }, "avatar");

        var stateMug = false;
        if (mugSignID !== Uuid.NULL) {
            stateMug = true;
        } 
        
        var message = {
            "channel": channel,
            "action": "AVATAR_ENTITY_STATE",
            "state": true,
            "stateMug": stateMug
        };
        tablet.emitScriptEvent(JSON.stringify(message));
    }

    function clearProtest() {
        if (protestSignID !== Uuid.NULL) {
            Entities.deleteEntity(protestSignID);
            protestSignID = Uuid.NULL;
        }
        var stateMug = false;
        if (mugSignID !== Uuid.NULL) {
            stateMug = true;
        }        
        var message = {
            "channel": channel,
            "action": "AVATAR_ENTITY_STATE",
            "state": false,
            "stateMug": stateMug
        };
        tablet.emitScriptEvent(JSON.stringify(message));
    }

    function clearMug() {
        if (mugSignID !== Uuid.NULL) {
            Entities.deleteEntity(mugSignID);
            mugSignID = Uuid.NULL;
        }
        var stateProtest = false;
        if (protestSignID !== Uuid.NULL) {
            stateProtest = true;
        }
        
        var message = {
            "channel": channel,
            "action": "AVATAR_ENTITY_STATE",
            "state": stateProtest,
            "stateMug": false
        };
        tablet.emitScriptEvent(JSON.stringify(message));
    }

    function generateSignageSign(url, shape) {

        var textures = {
            "base_color_texture": url,
            "normalmap_texture": ROOT + "models/ROUGH_METAL_NORMAL.jpg"
        };

        var dimensions = {"x": 1, "y": 1, "z": 1};
        switch(shape) {
            case "S":
                dimensions = {"x": 0.7961, "y": 3.0029, "z": 0.0500};
                break;
            case "H":
                dimensions = {"x": 1.0824, "y": 3.0029, "z": 0.0500};
                break;
            case "V":
                dimensions = {"x": 0.6133, "y": 3.0029, "z": 0.0500};
                break;
        }
        
        var signRotation = Quat.multiply(MyAvatar.orientation, Quat.fromVec3Degrees( { x: 0, y: 180, z: 0 } ));
        
        var id = Entities.addEntity({
           "name": "Sign - ",
           "type": "Model",
           "position": Vec3.sum(MyAvatar.feetPosition, Vec3.multiplyQbyV(MyAvatar.orientation, { x: 0, y: 0, z: -3 })),
           "rotation": signRotation,
           "dimensions": dimensions,
           "modelURL": ROOT + "models/sign_metal_" + shape.toLowerCase() + ".fst",
           "useOriginalPivot": true,
           "shapeType": "simple-compound",
           "grab": {
               "grabbable": false
           },
           "textures": JSON.stringify(textures)
        }, "domain");
        
    }
    
    function generateFramedSign(url, shape, isEmissive) {
        var textures = {
            "base_color_texture": url
        };
        
        var signFile = "framed_sign_";
        if (isEmissive) {
            signFile = "framed_sign_emissive_";
            textures = {
                "base_color_texture": url,
                "emission_color_texture": url
            };
        }

        var dimensions = {"x": 1, "y": 1, "z": 1};
        switch(shape) {
            case "S":
                dimensions = {"x": 1.6102, "y": 1.6102, "z": 0.0322};
                break;
            case "H":
                dimensions = {"x": 2.0, "y": 1.22, "z": 0.0400};
                break;
            case "V":
                dimensions = {"x": 1.22, "y": 2.0, "z": 0.0400};
                break;
        }
        
        var signRotation = Quat.multiply(MyAvatar.orientation, Quat.fromVec3Degrees( { x: 0, y: 0, z: 0 } ));
        
        var id = Entities.addEntity({
           "name": "Framed Sign - ",
           "type": "Model",
           "position": Vec3.sum(MyAvatar.position, Vec3.multiplyQbyV(MyAvatar.orientation, { x: 0, y: 0, z: -3 })),
           "rotation": signRotation,
           "dimensions": dimensions,
           "modelURL": ROOT + "models/" + signFile + shape.toLowerCase() + ".fst",
           "useOriginalPivot": true,
           "shapeType": "box",
           "grab": {
               "grabbable": false
           },
           "textures": JSON.stringify(textures)
        }, "domain");

    }
    
    function sendCurrentKnownDataToUI() {
        var message = {
            "channel": channel,
            "action": "INITIAL_DATA",
            "canRez": Entities.canRez(),
            "canRezAvatarEntities": Entities.canRezAvatarEntities(),
            "data": Settings.getValue( channel + ".lastUsage", DEFAULT_DATA )
        };
        tablet.emitScriptEvent(JSON.stringify(message));
    }

    //==================================================================

    function onScreenChanged(type, url) {
        if (type === "Web" && url.indexOf(APP_URL) !== -1) {
            appStatus = true;
        } else {
            appStatus = false;
        }

        if (protestSignID === Uuid.NULL && mugSignID === Uuid.NULL) {
            button.editProperties({
                isActive: appStatus
            });
        } else {
            button.editProperties({
                isActive: true
            });
        }
    }

    function cleanup() {
        if (protestSignID !== Uuid.NULL) {
            Entities.deleteEntity(protestSignID);
            protestSignID = Uuid.NULL;
        }

        if (mugSignID !== Uuid.NULL) {
            Entities.deleteEntity(mugSignID);
            mugSignID = Uuid.NULL;
        }
        
        if (appStatus) {
            tablet.gotoHomeScreen();
            tablet.webEventReceived.disconnect(onAppWebEventReceived);
        }

        tablet.screenChanged.disconnect(onScreenChanged);
        tablet.removeButton(button);
    }

    Script.scriptEnding.connect(cleanup);
}());
