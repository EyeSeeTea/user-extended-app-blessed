var request = require('request');
var periods = require('./periods.js');

var fs = require('fs')
fs.readFile('config.json', 'utf8', function(err, conf) {
    if (err) {
        return console.log(err);
    }
    var autoindicatorsLoader = new OutletRegistrator(JSON.parse(conf));
    autoindicatorsLoader.loadLastEvents();
});


/**
 * Class in charge of loading autoindicators turning them into datavalues.
 */
function OutletRegistrator(conf) {
		
    //used endpoints
    this.endpoints = {
        
        EVENTS: "/events.json?orgUnit=[ROOT]&ouMode=DESCENDANTS&program=[PROGRAM]&startDate=",
        EDITEVENTS: "/events/[EVENT]",
        ORGUNITS: "/organisationUnits/[PARENT].json?includeChildren=true",
        DATAVALUESETS: "/dataValueSets",
        ORGUNIT: "/organisationUnits/",
        ORGUNITGROUPORGUNIT: "/organisationUnitGroups/[OUGROUP]/organisationUnits/[ORGUNIT]",
        ORGUNITDATASET: "/organisationUnits/[ORGUNIT]/dataSets/[DATASET]",
        ORGUNITPROGRAM: "/organisationUnits/[ORGUNIT]/programs/[PROGRAM]",
        OUTLETTYPE: "/organisationUnitGroups?filter=name:eq:[OUTLETTYPE]",
        USERSFILTER: "/userCredentials?fields=id,username,userInfo&filter=username:eq:[USERNAME]",
        USERORGUNITS: "/users/[USER]/organisationUnits/[ORGUNIT]"
    };
    
    //This is the prefix of the Orgunit group names for Outlet Type
    this.outletTypePrefix = "MM Type - ";
    //This is the prefix for Myanmar
    this.myanmarPrefix = "MM_"
    //Count of imported org. units
    this.orgUnitsCreated = 0;
    //rest config
    this.conf = conf;

    //common auth, endpoint config
    this.requestOptions = {
        headers: {
            authorization: 'Basic ' + this.conf.auth,
        },
        url: this.conf.protocol + "://" + this.conf.url + ((this.conf.apiVersion == "")?"":"/" +this.conf.apiVersion)
    }
    console.log("\nConfig:\n", JSON.stringify(this.conf, null, "\t"));
};

/**
 * Returns an object with url and auth info for the given endpoint
 * @param endpoint The endpoint with the params included
 */
OutletRegistrator.prototype.prepareOptions = function(endpoint) {
    var options = Object.assign({}, this.requestOptions);
    options.url += endpoint;
    return options;
}

/**
 * Loads every event from the last 30 days ()
 */
OutletRegistrator.prototype.loadLastEvents = function() {
    console.log("\nLoading events...");
    var _this = this;
    //Ask for 'Events'
    var requestData = this.prepareOptions(this.endpoints.EVENTS);
    requestData = this.prepareEventsRequest(requestData);
    request(requestData, function(error, response, body) {
        _this.events = JSON.parse(body).events;
        console.log("Found " + _this.events.length + " events");
        _this.events = _this.events.filter(event => _this.isAlreadyImported(event)==false);
        console.log("Org. Units to import ", _this.events.length);
                
        if (_this.events.length == 0) {
        	console.log ("No org. units to import");
        	return;
        }
        
        _this.events.sort(function(event1, event2){
        	return (event1.eventDate > event2.eventDate) ? 1 : ((event2.eventDate > event1.eventDate) ? -1 : 0);
        });
        
        _this.WaterfallPattern(_this.events, function(event) { _this.buildOrgUnit(event);},
         function (){
        	console.log("Number of created org. units: ",_this.orgUnitsCreated);
         });
        
    });
};

/**
 * Watterfall pattern to call API methods in order
 * @params events
 * @params action The method to be executed per event
 * @params callback The method to be executed at the end of the iterations
 */
OutletRegistrator.prototype.WaterfallPattern = function(events, action, callback) {
    var nextEventIndex = 0;
	
    OutletRegistrator.prototype.nextEvent = function() {
        nextEventIndex++;
        if (nextEventIndex === events.length)
            callback();
        else
            action(events[nextEventIndex]);
    }
	
    action(events[0]);
};

/**
 * Replaces params in events url
 * @param requestData
 */
OutletRegistrator.prototype.prepareEventsRequest = function(requestData) {    
    requestData.url =  requestData.url.replace("[ROOT]",this.conf.rootOrgUnit);
    requestData.url =  requestData.url.replace("[PROGRAM]",this.conf.program);    
    requestData.url =  requestData.url + periods.moveAndFormatDay(this.conf.fromDate);
    return requestData;
}

/**
 * Creates an orgunit for the given event
 * @param event The event that will be converted into an orgunit
 */
OutletRegistrator.prototype.buildOrgUnit = function(event) {    
    
    var _this = this;
    //Find last orgunit to build autoinc
    var requestData = this.prepareOptions(this.endpoints.ORGUNITS);
    requestData.url = requestData.url.replace("[PARENT]",event.orgUnit);
    request(requestData, function(error, response, body) {
        console.log("Building event " +event.event+" ...");
        //error -> done
        if(error){
            console.error("\t",event.orgUnit," => cannot resolve children");
            _this.nextEvent();
            return;
        }
        
        var organisationUnits = JSON.parse(body).organisationUnits;
        //resolve parent code
        event.parentCode = _this.findParentCode (event,organisationUnits);
        if(!event.parentCode){
            console.error("\t",event.orgUnit," => cannot resolve 'parentCode'");
            _this.nextEvent();
            return;    
        }
        
        //resolve autoinc
        event.autoIncrement = _this.findLastAutoIncrement(event,organisationUnits) +1;
        
        if(!event.autoIncrement){
            console.error("\t",event.orgUnit," => cannot resolve 'autoIncrement'");
            _this.nextEvent();
            return;                
        }
               
        //Post orgunit 
        _this.postOrgUnit(event);
    });    
};

/**
 * Returns the orgUnit.code from the given event.orgUnit
 * @param event The event 
 */
OutletRegistrator.prototype.findParentCode = function(event,organisationUnits) {    
    var organisationUnit = organisationUnits.find(organisationUnit =>{
       return organisationUnit.id === event.orgUnit 
    });
    
    return organisationUnit?organisationUnit.code.split("_")[1]:null;
};

/**
 * Returns the orgUnit.organisationUnits.'maxcode' from the given event.orgUnit
 * @param event The event 
 */
OutletRegistrator.prototype.findLastAutoIncrement = function(event,organisationUnits) { 
    var max = 0;
    
	//filter only those following the right sequence 'MM_AMTR[PARENTCODE]-'
    var onlyAMTROrgUnits = organisationUnits.filter(organisationUnit => organisationUnit.code.indexOf("MM_AMTR"+event.parentCode+"-")!==-1);
    onlyAMTROrgUnits.forEach(function(AMTROrgUnit){
        var currentValue = parseInt(AMTROrgUnit.code.split("-")[1]);
        if (!isNaN(currentValue)) {
    	    max = currentValue>max?currentValue:max;
        }    
    });

    return max;    
};

/**
 * Post the new OrgUnit and PATCHES the event (alreadyImported:true)
 * @param event The event that will be converted into an orgunit
 */
OutletRegistrator.prototype.postOrgUnit = function(event) {    
    console.log("\t parentCode: ",event.parentCode," autoIncrement: "+event.autoIncrement);
    //Prepare orgUnit
    var newOrgUnit = this.createOrgUnitFromEvent(event);
    //Post orgunit  
    if (!this.isValidOrgUnit(newOrgUnit)) {
        console.log("Compulsory fields have not been filled ",newOrgUnit);
        this.nextEvent();
        return
    }
    this.postAndPatch(newOrgUnit, event);
  
};

/**
 * Returns a string with outlet code
 * {AMTR}{ParentCode}{-}{Increment}
 * @params parentCode of the parent org. unit
 * @params autoIncrement integer to be added to the code
 */
OutletRegistrator.prototype.createOrgUnitCode = function(parentCode,autoIncrement) {
    var formatNumber = (autoIncrement>0 && autoIncrement<10)?"0"+autoIncrement:autoIncrement;
    return "AMTR"+parentCode+"-"+formatNumber;
};

/**
 * DHIS2 format for coordinates [longitude,latitude]
 * @params coord [longitude, latitude] coordinates
 */
OutletRegistrator.prototype.setupCoordiantes = function(coord) {
    return [coord.longitude, coord.latitude]; 
};

/**
 * Returns an orgUnit with every required field
 * @param event The event with the data
 */
OutletRegistrator.prototype.createOrgUnitFromEvent = function(event) {

    var newOu = {};
    //get outlet name
    var outletName = this.findDataValue(event, this.conf.dataElements.name);
    //get outlet code
    var outletCode = this.createOrgUnitCode(event.parentCode, event.autoIncrement);
    //get outlet contact person
    var outletContactPerson = this.findDataValue(event, this.conf.dataElements.contactPerson);	
    //get outlet address
    var outletAddress = this.findDataValue(event, this.conf.dataElements.address);
    //get outlet phone number
    var outletPhoneNumber = this.findDataValue(event, this.conf.dataElements.phoneNumber);
    //get outlet type
    var outletType = this.findDataValue(event, this.conf.dataElements.outletType);
    
    newOu.code=this.myanmarPrefix+outletCode;
    newOu.name=outletName + " (" + outletCode + ")";
    newOu.shortName=outletName;
    newOu.openingDate=event.eventDate.split('T')[0]; //Removing the time
    newOu.featureType="POINT";
    newOu.parent={
        id:event.orgUnit
    };
    newOu.address=outletAddress;
    newOu.phoneNumber=outletPhoneNumber;
    newOu.contactPerson=outletContactPerson;
    newOu.outletType=outletType;
    //(0,0) means the coordinates have not been pushed from android
    if (event.coordinate.longitude!=0 ||  event.coordinate.latitude!=0)
    	newOu.coordinates=JSON.stringify(this.setupCoordiantes(event.coordinate));
    
    return newOu;
}

/**
 * Get the user from the event.
 * We need to get the user from the storedBy attribute of the datavalues
 * @params event
 */
OutletRegistrator.prototype.getUserFromEvent = function(event) {
    return event.dataValues.length>0 ? event.dataValues[0].storedBy : "";
}
  

/**
 * Returns the has been already imported or not
 * @param event The event
 */
OutletRegistrator.prototype.postAndPatch = function(newOrgUnit, event) {       

    var _this = this;
    var postInfo = this.prepareOptions(this.endpoints.ORGUNIT);
    postInfo.json = true;
    postInfo.body = newOrgUnit;
	
    request.post(postInfo, function(error, response, body){
        if (error) {
            console.error("Error creating the org. unit: ", error);
           _this.nextEvent();
           return;
        }
        //If the import was successful
        if (body.status == "OK") {
        	//Adding the uid to the new org. unit
        	newOrgUnit.uid = body.response.uid;
        	//Adding the user to the new org. unit
        	newOrgUnit.user = _this.getUserFromEvent(event);
            console.log("Created OrgUnit \n", newOrgUnit);
            _this.orgUnitsCreated++;
            _this.nextEvent();
            _this.decorateOrgUnit(newOrgUnit);
            _this.addOutletType(newOrgUnit);
            _this.addUser(newOrgUnit);
            _this.markImportedAsTrue(event);
            return;
        }
        console.log("Org Unit has not been created");
        console.log(JSON.stringify(body));
        _this.nextEvent();
    });
};

/**
 * Decorates the org. unit with dataSets, org. unit groups, and programs
 * @param newOrgUnit
 */
OutletRegistrator.prototype.decorateOrgUnit = function(newOrgUnit) {
    //Activate datasets
    this.activateDataSets(newOrgUnit);
    //Activate programs
    this.activatePrograms(newOrgUnit);
    //Add to OrgUnitGroups
    this.addToOrgUnitGroup(newOrgUnit);
};


/***
 * Activate programs for a particular OrgUnit
 * @param newOrgUnit
 */
OutletRegistrator.prototype.addToOrgUnitGroup = function(newOrgUnit) {
    var _this=this;
	
    this.conf.organisationUnitGroups.forEach(function(orgUnitGroupId){
        var postInfo = _this.prepareOptions(_this.endpoints.ORGUNITGROUPORGUNIT);
        postInfo.url = postInfo.url.replace("[OUGROUP]",orgUnitGroupId);
        postInfo.url = postInfo.url.replace("[ORGUNIT]", newOrgUnit.uid);
        postInfo.json = true;
        request.post(postInfo, function(error, response, body){
        	if (error) {console.error("Error adding the org. unit to the org. unit group ",error)}
        	console.log(JSON.stringify(body));
        });
    });
};


/***
 * Activate programs for a particular OrgUnit
 * @param newOrgUnit
 */
OutletRegistrator.prototype.activatePrograms = function(newOrgUnit) {				
    var _this=this;
    this.conf.programs.forEach(function(programId){
        var postInfo = _this.prepareOptions(_this.endpoints.ORGUNITPROGRAM);
        postInfo.url = postInfo.url.replace("[ORGUNIT]", newOrgUnit.uid);
        postInfo.url = postInfo.url.replace("[PROGRAM]",programId);
        postInfo.json = true;
        
        request.post(postInfo, function(error, response, body){
            if (error) {console.error("Error activating program ",error)}
            console.log(JSON.stringify(body));
        });
    });
};


/***
 * Activate datasets for a particular OrgUnit
 * @param newOrgUnit
 */
OutletRegistrator.prototype.activateDataSets = function(newOrgUnit) {
    var _this=this;
    
    this.conf.dataSets.forEach(function(dataSetId){
        var postInfo = _this.prepareOptions(_this.endpoints.ORGUNITDATASET);
        postInfo.url = postInfo.url.replace("[ORGUNIT]", newOrgUnit.uid);
        postInfo.url = postInfo.url.replace("[DATASET]",dataSetId);
        postInfo.json = true;
        request.post(postInfo, function(error, response, body){
            if (error) {console.error("Error activating dataset ",error)}
            console.log(JSON.stringify(body));
        });
    });	
};


/**
 * Look for the specific Org Unit Group based on the outletTypeName
 * If found, it calls the method to add the org. unit to the orgunit group
 * @param newOrgUnit
 */
OutletRegistrator.prototype.addOutletType = function(newOrgUnit) {
    var _this = this;
    
    var completeOutletType = this.outletTypePrefix + newOrgUnit.outletType;
    var requestData = this.prepareOptions(this.endpoints.OUTLETTYPE);
    requestData.url = requestData.url.replace("[OUTLETTYPE]", completeOutletType);
    requestData.json = true;
    request(requestData, function(error, response, body){
        if (error) {
            console.error("Error getting the outlet type ",error);
            return;	
        }
        if (body.organisationUnitGroups.length!=1) {
            console.log("Outlet type not found in the server")
            return;
        }
        //get the outletType.
        var outletType = body.organisationUnitGroups[0];
        _this.setupOutletType(newOrgUnit,outletType);
    });
};

/**
 * Add the new org. unit to the an OutletType org. unit group
 * @param newOrgUnit
 * @param outletType
 */
OutletRegistrator.prototype.setupOutletType = function(newOrgUnit, outletType) {
    var postInfo = this.prepareOptions(this.endpoints.ORGUNITGROUPORGUNIT);
    postInfo.url = postInfo.url.replace("[ORGUNIT]", newOrgUnit.uid);
    postInfo.url = postInfo.url.replace("[OUGROUP]",outletType.id);
    postInfo.json = true;
    request.post(postInfo, function(error, response, body){
        if (error) {console.error("Error adding the orgunit to the outlet type ",error)}
        console.log(JSON.stringify(body));
    });
};

/**
 * Look for the DHIS2 user who has created the event
 * If found, it calls the method to add the org. unit to the user
 * @param newOrgUnit
 */
OutletRegistrator.prototype.addUser = function(newOrgUnit) {
    var _this = this;
    
    console.log("Adding user ", newOrgUnit.user, " to the org. unit ", newOrgUnit.uid);
    var requestData = this.prepareOptions(this.endpoints.USERSFILTER);
    requestData.url = requestData.url.replace("[USERNAME]", newOrgUnit.user);
    console.log(requestData.url);
    requestData.json = true;
    request(requestData, function(error, response, body){
        if (error) {
            console.error("Error getting the users ",error);
            return;	
        }
        if (body.userCredentials.length!=1) {
            console.log("User not found in the server")
            return;
        }
        //get the outletType
        var user = body.userCredentials[0];
        _this.setupUser(newOrgUnit,user);
    });
};

/**
 * Add the new org. unit to the DHIS2 user
 * @param newOrgUnit
 * @param user
 */
OutletRegistrator.prototype.setupUser = function(newOrgUnit, user) {
    var postInfo = this.prepareOptions(this.endpoints.USERORGUNITS);
    postInfo.url = postInfo.url.replace("[ORGUNIT]", newOrgUnit.uid);
    postInfo.url = postInfo.url.replace("[USER]",user.userInfo.id);
    postInfo.json = true;
    request.post(postInfo, function(error, response, body){
        if (error) {console.error("Error adding the orgunit to the user ",error)}
        console.log(JSON.stringify(body));
    });
};

/**
 * Marks the event as already imported
 * @param event
 */
OutletRegistrator.prototype.markImportedAsTrue = function(event) {
    var eventToUpdate = this.fillEventToUpdate(event);
    var putInfo = this.prepareOptions(this.endpoints.EDITEVENTS);
    putInfo.url = putInfo.url.replace("[EVENT]",event.event);
    putInfo.body = eventToUpdate;
    putInfo.json = true;
    
    request.put(putInfo, function(error, response, body){
        if (error) {console.error("Error updating the event ", error)};
        console.log(JSON.stringify(body));
    });
};

/**
 * Format the event to be updated. It set up 'already imported' to true
 * @param event
 */
OutletRegistrator.prototype.fillEventToUpdate = function(event) {
    var eventToUpdate = {};
    var _this = this;
    
    eventToUpdate.program = event.program ;
    eventToUpdate.programStage = event.programStage;
    eventToUpdate.event = event.event;
    eventToUpdate.orgUnit = event.orgUnit;
    eventToUpdate.status = event.status;
    eventToUpdate.eventDate = event.eventDate.split('T')[0];
    eventToUpdate.storedBy = event.storedBy;
    eventToUpdate.coordinate = event.coordinate;
    eventToUpdate.dataValues = [];
    event.dataValues.forEach(function(dataValue) {
        if (dataValue.dataElement != _this.conf.dataElements.alreadyImported)
            eventToUpdate.dataValues.push({dataElement:dataValue.dataElement, value:dataValue.value});
    });
    eventToUpdate.dataValues.push({dataElement:_this.conf.dataElements.alreadyImported, value:"true"});
    
    return eventToUpdate;
};

/**
 * Check if the org. unit has all its compulsory fields filled
 * @param orgUnit
 */
OutletRegistrator.prototype.isValidOrgUnit = function(orgUnit) {
    
    var validOrgUnit = orgUnit.shortName!=null && orgUnit.shortName.trim()!="" && orgUnit.outletType!=null && 
    orgUnit.outletType.trim()!="" && orgUnit.contactPerson!=null && orgUnit.contactPerson.trim()!="" && 
    orgUnit.address!=null && orgUnit.address.trim()!="";
    
    return validOrgUnit;
}

/**
 * Returns the has been already imported or not
 * @param event The event
 */
OutletRegistrator.prototype.isAlreadyImported = function(event) {    
    var imported = this.findDataValue(event,this.conf.dataElements.alreadyImported);
    return imported===null ? false : true;
};

/**
 * Returns the value for the given dataElement and event
 * @param event The event 
 * @param dataElement The dataElement 
 */
OutletRegistrator.prototype.findDataValue = function(event,dataElement) {    
    if (!event || !event.dataValues || !dataElement){
        return null;
    }
    
    var dataValueFound = event.dataValues.find (dataValue =>{
       return dataValue.dataElement === dataElement 
    });
    
    return dataValueFound?dataValueFound.value:null;
};

